// F1 API Service using Jolpi (Ergast fork) and OpenF1 for live telemetry
import { Driver, Team, Race } from '../types';
import { TEAM_FALLBACKS, DRIVER_IMAGES, DEFAULT_DRIVER_IMAGE, CIRCUIT_LAYOUTS, DEFAULT_CIRCUIT_LAYOUT } from '../data/fallbacks';

const JOLPI_BASE = 'https://api.jolpi.ca/ergast/f1';
const OPENF1_BASE = 'https://api.openf1.org/v1';

export async function getDriverStandings(): Promise<Driver[]> {
  try {
    const [jolpiRes, openF1Res] = await Promise.all([
      fetch(`${JOLPI_BASE}/current/driverStandings.json`),
      fetch(`${OPENF1_BASE}/drivers?session_key=latest`).catch(() => null)
    ]);
    
    const data = await jolpiRes.json();
    let openF1Drivers: any[] = [];
    if (openF1Res && openF1Res.ok) {
      openF1Drivers = await openF1Res.json();
    }
    
    const standings = data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
    
    return standings.map((d: any) => {
      const lastName = d.Driver.familyName.toLowerCase();
      const number = parseInt(d.Driver.permanentNumber) || 0;
      
      // Try to find driver in OpenF1 by number or last name
      const openF1Driver = openF1Drivers.find((od: any) => 
        od.driver_number === number || 
        (od.last_name && od.last_name.toLowerCase() === lastName)
      );
      
      let image = DEFAULT_DRIVER_IMAGE;
      if (openF1Driver && openF1Driver.headshot_url) {
        // OpenF1 headshot URLs often end with .transform/1col/image.png which is small.
        // We can replace it with 2col for better quality.
        image = openF1Driver.headshot_url.replace('1col', '2col');
      } else {
        const imageKey = Object.keys(DRIVER_IMAGES).find(k => lastName.includes(k));
        if (imageKey) image = DRIVER_IMAGES[imageKey];
      }
      
      return {
        id: d.Driver.driverId,
        name: `${d.Driver.givenName} ${d.Driver.familyName}`,
        number,
        teamId: d.Constructors[0]?.constructorId || '',
        points: parseFloat(d.points),
        wins: parseInt(d.wins),
        podiums: 0, // Jolpi doesn't provide podiums easily
        country: d.Driver.nationality,
        image
      };
    });
  } catch (error) {
    console.error('Error fetching driver standings:', error);
    return [];
  }
}

export async function getConstructorStandings(): Promise<Team[]> {
  try {
    const res = await fetch(`${JOLPI_BASE}/current/constructorStandings.json`);
    const data = await res.json();
    const standings = data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || [];
    
    return standings.map((t: any) => {
      const teamId = t.Constructor.constructorId.toLowerCase();
      const teamName = t.Constructor.name.toLowerCase();
      
      // Better matching logic to prevent 'rb' matching 'red_bull' incorrectly
      let fallbackKey = '';
      for (const key of Object.keys(TEAM_FALLBACKS)) {
        const normalizedKey = key.replace('_', '');
        if (
          teamId === key || 
          teamId === normalizedKey ||
          teamName.includes(key.replace('_', ' ')) ||
          (key === 'rb' && (teamId === 'rb' || teamName === 'rb' || teamName.includes('racing bulls'))) ||
          (key === 'sauber' && (teamId.includes('sauber') || teamName.includes('sauber') || teamName.includes('kick') || teamName.includes('stake'))) ||
          (key === 'audi' && (teamId.includes('audi') || teamName.includes('audi')))
        ) {
          fallbackKey = key;
          break;
        }
      }
      
      const fallback = fallbackKey ? TEAM_FALLBACKS[fallbackKey] : {
        color: '#ffffff',
        logo: 'https://media.formula1.com/content/dam/fom-website/manual/Misc/F1_logo.png',
        carImage: 'https://media.formula1.com/d_team_car_fallback_image.png/content/dam/fom-website/teams/fallback.png',
        principal: 'N/A'
      };
      
      return {
        id: t.Constructor.constructorId,
        name: t.Constructor.name,
        principal: fallback.principal,
        base: t.Constructor.nationality,
        points: parseFloat(t.points),
        color: fallback.color,
        logo: fallback.logo,
        carImage: fallback.carImage
      };
    });
  } catch (error) {
    console.error('Error fetching constructor standings:', error);
    return [];
  }
}

export async function getSchedule(): Promise<Race[]> {
  try {
    const res = await fetch(`${JOLPI_BASE}/current.json`);
    const data = await res.json();
    const races = data.MRData.RaceTable.Races || [];
    
    const now = new Date();
    
    return races.map((r: any) => {
      const time = (r.time && r.time.trim() !== '') ? (r.time.endsWith('Z') ? r.time : `${r.time}Z`) : '00:00:00Z';
      const fullDate = `${r.date}T${time}`;
      const raceDate = new Date(fullDate);
      let status: 'upcoming' | 'completed' | 'live' = 'upcoming';
      
      // Simple logic for status
      if (raceDate < now) {
        // If it was within the last 3 hours, call it live
        const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        if (raceDate > threeHoursAgo) {
          status = 'live';
        } else {
          status = 'completed';
        }
      }
      
      const country = r.Circuit.Location.country.toLowerCase();
      const layoutKey = Object.keys(CIRCUIT_LAYOUTS).find(k => country.includes(k) || r.Circuit.circuitName.toLowerCase().includes(k));

      return {
        id: r.round,
        name: r.raceName,
        circuit: r.Circuit.circuitName,
        country: r.Circuit.Location.country,
        date: fullDate,
        laps: 50, // Fallback
        length: 300, // Fallback
        status,
        layoutImage: layoutKey ? CIRCUIT_LAYOUTS[layoutKey] : DEFAULT_CIRCUIT_LAYOUT
      };
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return [];
  }
}

// OpenF1 Live Data (Latest Session)
export async function checkApiHealth(): Promise<boolean> {
  try {
    const [jolpi, openf1] = await Promise.all([
      fetch(`${JOLPI_BASE}/current/driverStandings.json?limit=1`).catch(() => ({ ok: false })),
      fetch(`${OPENF1_BASE}/sessions?session_key=latest`).catch(() => ({ ok: false }))
    ]);
    const isHealthy = jolpi.ok || openf1.ok;
    if (!isHealthy) {
      console.warn('API Health Check failed:', { jolpi: jolpi.ok, openf1: openf1.ok });
    }
    return isHealthy;
  } catch (e) {
    console.error('API Health Check error:', e);
    return false;
  }
}

export async function getLiveSessionData() {
  try {
    // Try to fetch latest session first
    let sessionRes = await fetch(`${OPENF1_BASE}/sessions?session_key=latest`).catch(() => null);
    let sessionData = sessionRes && sessionRes.ok ? await sessionRes.json() : [];

    // Fallback: if latest fails or is empty, get the most recent sessions and pick the last one
    if (!Array.isArray(sessionData) || sessionData.length === 0) {
      console.log('Latest session query empty or failed, falling back to full sessions list...');
      const allSessionsRes = await fetch(`${OPENF1_BASE}/sessions`).catch(() => null);
      if (allSessionsRes && allSessionsRes.ok) {
        const allSessions = await allSessionsRes.json();
        if (Array.isArray(allSessions) && allSessions.length > 0) {
          // Sort by date descending and pick the first one
          sessionData = [allSessions[allSessions.length - 1]];
        }
      }
    }

    if (!Array.isArray(sessionData) || sessionData.length === 0) {
      console.warn('No session found in OpenF1');
      return null;
    }

    const session = sessionData[0];
    const sessionKey = session?.session_key;

    if (!sessionKey) return null;

    // To prevent huge data transfers, we only fetch the last 10 seconds of car data
    // and we use a more resilient fetching strategy
    const now = new Date();
    const tenSecondsAgo = new Date(now.getTime() - 10000).toISOString();

    const fetchJson = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        return await res.json();
      } catch (e) {
        console.warn(`Failed to fetch from ${url}:`, e);
        return [];
      }
    };

    const [drivers, positions, intervals, weatherData, laps, stints, carData] = await Promise.all([
      fetchJson(`${OPENF1_BASE}/drivers?session_key=${sessionKey}`),
      fetchJson(`${OPENF1_BASE}/position?session_key=${sessionKey}`),
      fetchJson(`${OPENF1_BASE}/intervals?session_key=${sessionKey}`),
      fetchJson(`${OPENF1_BASE}/weather?session_key=${sessionKey}`),
      fetchJson(`${OPENF1_BASE}/laps?session_key=${sessionKey}`),
      fetchJson(`${OPENF1_BASE}/stints?session_key=${sessionKey}`),
      fetchJson(`${OPENF1_BASE}/car_data?session_key=${sessionKey}&date>=${tenSecondsAgo}`)
    ]);

    return { 
      session,
      drivers: Array.isArray(drivers) ? drivers : [], 
      positions: Array.isArray(positions) ? positions : [], 
      intervals: Array.isArray(intervals) ? intervals : [],
      laps: Array.isArray(laps) ? laps : [],
      stints: Array.isArray(stints) ? stints : [],
      carData: Array.isArray(carData) ? carData : [],
      weather: Array.isArray(weatherData) && weatherData.length > 0 ? weatherData[weatherData.length - 1] : null
    };
  } catch (error) {
    console.error('Error fetching live session data:', error);
    return null;
  }
}
