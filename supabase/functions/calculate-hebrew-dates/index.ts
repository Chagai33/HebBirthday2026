import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface HebcalResponse {
  hebrew: string;
  gy?: number;
  gm?: number;
  gd?: number;
}

async function fetchHebcalData(
  gregorianDate: string,
  afterSunset: boolean
): Promise<HebcalResponse> {
  const [year, month, day] = gregorianDate.split('-');

  const params = new URLSearchParams({
    cfg: 'json',
    gy: year,
    gm: month,
    gd: day,
    g2h: '1',
    lg: 's',
  });

  if (afterSunset) {
    params.append('gs', 'on');
  }

  const url = `https://www.hebcal.com/converter?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Hebcal API error: ${response.statusText}`);
  }

  return await response.json();
}

async function fetchNextHebrewBirthdays(
  hebrewDate: string,
  yearsAhead: number = 10
): Promise<string[]> {
  const currentYear = new Date().getFullYear();
  const futureDates: string[] = [];

  for (let i = 0; i <= yearsAhead; i++) {
    try {
      const params = new URLSearchParams({
        cfg: 'json',
        hd: hebrewDate,
        h2g: '1',
        gy: (currentYear + i).toString(),
      });

      const url = `https://www.hebcal.com/converter?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) continue;

      const data: HebcalResponse = await response.json();
      if (data.gy && data.gm && data.gd) {
        const date = `${data.gy}-${String(data.gm).padStart(2, '0')}-${String(data.gd).padStart(2, '0')}`;
        const dateObj = new Date(date);
        if (dateObj >= new Date()) {
          futureDates.push(date);
        }
      }
    } catch (error) {
      console.warn(`Error fetching year ${currentYear + i}:`, error);
    }
  }

  return futureDates.sort();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { birthdayId, birthDateGregorian, afterSunset } = await req.json();

    if (!birthdayId || !birthDateGregorian) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const hebcalData = await fetchHebcalData(birthDateGregorian, afterSunset || false);

    if (!hebcalData.hebrew) {
      throw new Error('No Hebrew date returned from Hebcal');
    }

    const futureDates = await fetchNextHebrewBirthdays(hebcalData.hebrew, 10);

    const updateData: any = {
      birth_date_hebrew_string: hebcalData.hebrew,
      updated_at: new Date().toISOString(),
    };

    if (futureDates.length > 0) {
      updateData.next_upcoming_hebrew_birthday = futureDates[0];
      updateData.future_hebrew_birthdays = futureDates;
    }

    const { error } = await supabase
      .from('birthdays')
      .update(updateData)
      .eq('id', birthdayId);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        hebrewDate: hebcalData.hebrew,
        nextBirthday: futureDates[0],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error calculating Hebrew dates:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
