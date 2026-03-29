// F1 API Service using Jolpi (Ergast fork) and OpenF1 for live telemetry
import { Driver, Team, Race } from '../types';
import { TEAM_FALLBACKS, DRIVER_IMAGES, DEFAULT_DRIVER_IMAGE, CIRCUIT_LAYOUTS, DEFAULT_CIRCUIT_LAYOUT } from '../data/fallbacks';

const JOLPI_BASE = 'https://api.jolpi.ca/ergast/f1';
const OPENF1_BASE = 'https://api.openf1.org/v1';

// Edge calculating intelligence: Calculate points, wins, and podiums from recent OpenF1 sessions not yet in Jolpi
async function getRecentUncalculatedPoints(): Promise<{ 
  driverPoints: Record<number, number>, 
  teamPoints: Record<string, number>,
  driverWins: Record<number, number>,
  teamWins: Record<string, number>,
  driverPodiums: Record<number, number>,
  teamPodiums: Record<string, number>
}> {
  try {
    const driverPoints: Record<number, number> = {};
    const teamPoints: Record<string, number> = {};
    const driverWins: Record<number, number> = {};
    const teamWins: Record<string, number> = {};
    const driverPodiums: Record<number, number> = {};
    const teamPodiums: Record<string, number> = {};

    // 1. Get latest Jolpi results to know what's already calculated
    const [jolpiResultsRes, jolpiSprintRes] = await Promise.all([
      fetch(`${JOLPI_BASE}/current/results.json?limit=100`),
      fetch(`${JOLPI_BASE}/current/sprint.json?limit=100`)
    ]);
    
    const jolpiResults = await jolpiResultsRes.json();
    const jolpiSprint = await jolpiSprintRes.json();
    
    const completedRaces = jolpiResults.MRData.RaceTable.Races.length;
    // We assume round numbers match sequentially.
    // Let's get the latest round that has results in Jolpi
    let latestJolpiRound = 0;
    if (jolpiResults.MRData.RaceTable.Races.length > 0) {
      latestJolpiRound = Math.max(...jolpiResults.MRData.RaceTable.Races.map((r: any) => parseInt(r.round)));
    }

    // 2. Get OpenF1 sessions
    const now = new Date();
    const openF1SessionsRes = await fetch(`${OPENF1_BASE}/sessions?year=${now.getFullYear()}`);
    if (!openF1SessionsRes.ok) return { driverPoints, teamPoints, driverWins, teamWins, driverPodiums, teamPodiums };
    const openF1Sessions = await openF1SessionsRes.json();

    // Group OpenF1 sessions by meeting_key (which roughly corresponds to a round)
    // We need to find sessions that are 'Race' or 'Sprint', have ended, but their round is > latestJolpiRound
    // Note: meeting_key is not exactly round number. Let's sort meetings by date_start to assign round numbers.
    const meetings = [...new Set(openF1Sessions.map((s: any) => s.meeting_key))];
    meetings.sort((a: any, b: any) => {
      const sA = openF1Sessions.find((s: any) => s.meeting_key === a);
      const sB = openF1Sessions.find((s: any) => s.meeting_key === b);
      return new Date(sA.date_start).getTime() - new Date(sB.date_start).getTime();
    });

    const uncalculatedSessions = openF1Sessions.filter((s: any) => {
      if (s.session_type !== 'Race' && s.session_type !== 'Sprint') return false;
      if (new Date(s.date_end) > now) return false; // Not finished yet
      
      const roundNumber = meetings.indexOf(s.meeting_key) + 1;
      if (roundNumber <= latestJolpiRound) return false; // Already in Jolpi
      
      return true;
    });

    if (uncalculatedSessions.length === 0) return { driverPoints, teamPoints, driverWins, teamWins, driverPodiums, teamPodiums };

    // 3. Calculate points for uncalculated sessions
    const racePointsMap: Record<number, number> = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 };
    const sprintPointsMap: Record<number, number> = { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 };

    for (const session of uncalculatedSessions) {
      const isSprint = session.session_type === 'Sprint' || session.session_name === 'Sprint';
      const pointsMap = isSprint ? sprintPointsMap : racePointsMap;

      const [positionsRes, driversRes, lapsRes] = await Promise.all([
        fetch(`${OPENF1_BASE}/position?session_key=${session.session_key}`),
        fetch(`${OPENF1_BASE}/drivers?session_key=${session.session_key}`),
        fetch(`${OPENF1_BASE}/laps?session_key=${session.session_key}`).catch(() => null)
      ]);
      
      if (!positionsRes.ok || !driversRes.ok) continue;
      
      const positionsData = await positionsRes.json();
      const driversData = await driversRes.json();
      
      let fastestLapDriverNum: number | null = null;
      if (!isSprint && lapsRes && lapsRes.ok) {
        try {
          const lapsData = await lapsRes.json();
          let minDuration = Infinity;
          for (const lap of lapsData) {
            if (lap.lap_duration && lap.lap_duration < minDuration) {
              minDuration = lap.lap_duration;
              fastestLapDriverNum = lap.driver_number;
            }
          }
        } catch (e) {
          console.error("Failed to parse laps data", e);
        }
      }

      // Map driver number to team name
      const driverToTeam: Record<number, string> = {};
      for (const driver of driversData) {
        driverToTeam[driver.driver_number] = driver.team_name;
      }

      // Get final position for each driver
      const finalPositions: Record<number, any> = {};
      for (const pos of positionsData) {
        const driverNum = pos.driver_number;
        if (!finalPositions[driverNum] || new Date(pos.date) > new Date(finalPositions[driverNum].date)) {
          finalPositions[driverNum] = pos;
        }
      }

      // Add points, wins, podiums
      for (const driverNumStr of Object.keys(finalPositions)) {
        const driverNum = parseInt(driverNumStr);
        const pos = finalPositions[driverNum].position;
        const teamName = driverToTeam[driverNum];
        
        if (!isSprint) {
          if (pos === 1) {
            driverWins[driverNum] = (driverWins[driverNum] || 0) + 1;
            if (teamName) teamWins[teamName] = (teamWins[teamName] || 0) + 1;
          }
          if (pos <= 3) {
            driverPodiums[driverNum] = (driverPodiums[driverNum] || 0) + 1;
            if (teamName) teamPodiums[teamName] = (teamPodiums[teamName] || 0) + 1;
          }
        }
        
        if (pointsMap[pos]) {
          let points = pointsMap[pos];
          
          // Add fastest lap point if in top 10
          if (!isSprint && pos <= 10 && fastestLapDriverNum === driverNum) {
            points += 1;
          }
          
          driverPoints[driverNum] = (driverPoints[driverNum] || 0) + points;
          
          if (teamName) {
            teamPoints[teamName] = (teamPoints[teamName] || 0) + points;
          }
        }
      }
    }

    return { driverPoints, teamPoints, driverWins, teamWins, driverPodiums, teamPodiums };
  } catch (error) {
    console.error('Error calculating edge points:', error);
    return { driverPoints: {}, teamPoints: {}, driverWins: {}, teamWins: {}, driverPodiums: {}, teamPodiums: {} };
  }
}

export async function getDriverStandings(): Promise<Driver[]> {
  try {
    const [jolpiRes, openF1Res, uncalculatedPoints] = await Promise.all([
      fetch(`${JOLPI_BASE}/current/driverStandings.json`),
      fetch(`${OPENF1_BASE}/drivers?session_key=latest`).catch(() => null),
      getRecentUncalculatedPoints()
    ]);
    
    const data = await jolpiRes.json();
    let openF1Drivers: any[] = [];
    if (openF1Res && openF1Res.ok) {
      openF1Drivers = await openF1Res.json();
    }
    
    const standings = data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
    
    const drivers = standings.map((d: any) => {
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
      
      let points = parseFloat(d.points);
      let wins = parseInt(d.wins);
      let podiums = 0; // Jolpi doesn't provide podiums easily in standings
      
      // Add edge calculated points, wins, podiums
      if (uncalculatedPoints.driverPoints[number]) {
        points += uncalculatedPoints.driverPoints[number];
      }
      if (uncalculatedPoints.driverWins[number]) {
        wins += uncalculatedPoints.driverWins[number];
      }
      if (uncalculatedPoints.driverPodiums[number]) {
        podiums += uncalculatedPoints.driverPodiums[number];
      }
      
      return {
        id: d.Driver.driverId,
        name: `${d.Driver.givenName} ${d.Driver.familyName}`,
        number,
        teamId: d.Constructors[0]?.constructorId || '',
        points,
        wins,
        podiums,
        country: d.Driver.nationality,
        image
      };
    });

    // Sort by points descending
    return drivers.sort((a: Driver, b: Driver) => b.points - a.points);
  } catch (error) {
    console.error('Error fetching driver standings:', error);
    return [];
  }
}

export async function getConstructorStandings(): Promise<Team[]> {
  try {
    const [res, uncalculatedPoints] = await Promise.all([
      fetch(`${JOLPI_BASE}/current/constructorStandings.json`),
      getRecentUncalculatedPoints()
    ]);
    const data = await res.json();
    const standings = data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || [];
    
    const teams = standings.map((t: any) => {
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
      
      let points = parseFloat(t.points);
      let wins = parseInt(t.wins);
      let podiums = 0; // Jolpi doesn't provide podiums easily in standings
      
      // Add edge calculated points, wins, podiums
      // OpenF1 team names might not match exactly, so we check if the OpenF1 team name includes the Jolpi team name or vice versa
      for (const [openF1TeamName, extraPoints] of Object.entries(uncalculatedPoints.teamPoints)) {
        const openF1Lower = openF1TeamName.toLowerCase();
        if (
          openF1Lower.includes(teamName) || 
          teamName.includes(openF1Lower) ||
          (fallbackKey === 'rb' && (openF1Lower.includes('rb') || openF1Lower.includes('racing bulls'))) ||
          (fallbackKey === 'audi' && openF1Lower.includes('audi')) ||
          (fallbackKey === 'haas' && openF1Lower.includes('haas')) ||
          (fallbackKey === 'red_bull' && openF1Lower.includes('red bull'))
        ) {
          points += extraPoints;
          if (uncalculatedPoints.teamWins[openF1TeamName]) wins += uncalculatedPoints.teamWins[openF1TeamName];
          if (uncalculatedPoints.teamPodiums[openF1TeamName]) podiums += uncalculatedPoints.teamPodiums[openF1TeamName];
        }
      }
      
      return {
        id: t.Constructor.constructorId,
        name: t.Constructor.name,
        principal: fallback.principal,
        base: t.Constructor.nationality,
        points,
        wins,
        podiums,
        color: fallback.color,
        logo: fallback.logo,
        carImage: fallback.carImage
      };
    });

    // Sort by points descending
    return teams.sort((a: Team, b: Team) => b.points - a.points);
  } catch (error) {
    console.error('Error fetching constructor standings:', error);
    return [];
  }
}

export async function getSchedule(): Promise<Race[]> {
  try {
    const [res, resultsRes] = await Promise.all([
      fetch(`${JOLPI_BASE}/current.json`),
      fetch(`${JOLPI_BASE}/current/results.json?limit=100`).catch(() => null)
    ]);
    
    const data = await res.json();
    const races = data.MRData.RaceTable.Races || [];
    
    let resultsData: any = null;
    if (resultsRes && resultsRes.ok) {
      resultsData = await resultsRes.json();
    }
    
    const now = new Date();
    
    const mappedRaces = races.map((r: any) => {
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

      let winnerId;
      if (resultsData && resultsData.MRData.RaceTable.Races) {
        const resultRace = resultsData.MRData.RaceTable.Races.find((rr: any) => rr.round === r.round);
        if (resultRace && resultRace.Results && resultRace.Results.length > 0) {
          winnerId = resultRace.Results[0].Driver.driverId;
        }
      }

      return {
        id: r.round,
        name: r.raceName,
        circuit: r.Circuit.circuitName,
        country: r.Circuit.Location.country,
        date: fullDate,
        laps: 50, // Fallback
        length: 300, // Fallback
        status,
        winnerId,
        layoutImage: layoutKey ? CIRCUIT_LAYOUTS[layoutKey] : DEFAULT_CIRCUIT_LAYOUT
      };
    });
    
    // Fetch missing winnerId from OpenF1 for recently completed races
    for (const race of mappedRaces) {
      if (race.status === 'completed' && !race.winnerId) {
        try {
          // Find the corresponding OpenF1 session
          const openF1SessionsRes = await fetch(`${OPENF1_BASE}/sessions?year=${now.getFullYear()}&session_type=Race`);
          if (openF1SessionsRes.ok) {
            const sessions = await openF1SessionsRes.json();
            // Match by country or circuit name roughly
            const session = sessions.find((s: any) => 
              s.country_name.toLowerCase().includes(race.country.toLowerCase()) || 
              race.country.toLowerCase().includes(s.country_name.toLowerCase())
            );
            
            if (session) {
              const positionsRes = await fetch(`${OPENF1_BASE}/position?session_key=${session.session_key}`);
              if (positionsRes.ok) {
                const positionsData = await positionsRes.json();
                // Find driver with position 1
                // Get final position for each driver
                const finalPositions: Record<number, any> = {};
                for (const pos of positionsData) {
                  const driverNum = pos.driver_number;
                  if (!finalPositions[driverNum] || new Date(pos.date) > new Date(finalPositions[driverNum].date)) {
                    finalPositions[driverNum] = pos;
                  }
                }
                
                const winnerNumStr = Object.keys(finalPositions).find(num => finalPositions[parseInt(num)].position === 1);
                if (winnerNumStr) {
                  const winnerNum = parseInt(winnerNumStr);
                  // We need to map driver number to driverId. We can fetch drivers from OpenF1
                  const driversRes = await fetch(`${OPENF1_BASE}/drivers?session_key=${session.session_key}&driver_number=${winnerNum}`);
                  if (driversRes.ok) {
                    const driversData = await driversRes.json();
                    if (driversData.length > 0) {
                      // We just use the last name as a rough driverId fallback, or we can use the acronym
                      // Jolpi driverId is usually last name lowercase
                      race.winnerId = driversData[0].last_name.toLowerCase();
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to fetch missing winner from OpenF1", e);
        }
      }
    }
    
    return mappedRaces;
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
