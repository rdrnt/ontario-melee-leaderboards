import { getPlayerDataThrottled } from './slippi'
import { GoogleSpreadsheet } from 'google-spreadsheet';
import creds from '../secrets/creds.json';
import * as syncFs from 'fs';
import * as path from 'path';
import util from 'util';
import * as settings from '../settings'

import { exec } from 'child_process';
const fs = syncFs.promises;
const execPromise = util.promisify(exec);

const SpreadsheetColumnKeys = {
  'PROVINCE': 'Province',
  'CITY': 'City',
  'CONNECT_CODE': 'What is your slippi connect code (e.g. BLRP#745)',
}

function uniq(a, param){
  return a.filter(function(item, pos, array){
      return array.map(function(mapItem){ return mapItem[param]; }).indexOf(item[param]) === pos;
  })
}

const getPlayerConnectCodes = async (): Promise<string[]> => {
  const doc = new GoogleSpreadsheet(settings.spreadsheetID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo(); // loads document properties and worksheets
  const sheet = doc.sheetsByIndex[0];
  const rows = (await sheet.getRows()).slice(1); // remove header row

  rows.forEach(row => {
    console.log('Row', row[SpreadsheetColumnKeys.PROVINCE], row[SpreadsheetColumnKeys.CONNECT_CODE], row[SpreadsheetColumnKeys.CITY]);
  })

  const connectCodes = [...new Set(rows.map((r) => r._rawData[1]).filter(r => r !== ''))] as string[];
  return connectCodes;
};

const getPlayerSpreadsheetData = async (): Promise<{ connectCode: string; province: string; city: string}[]> => {
  const doc = new GoogleSpreadsheet(settings.spreadsheetID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo(); // loads document properties and worksheets
  const sheet = doc.sheetsByIndex[0];
  const rows = (await sheet.getRows()).slice(1); // remove header row

  const allRows = [];

  for (const row of rows) {
    if (row[SpreadsheetColumnKeys.CONNECT_CODE] && row[SpreadsheetColumnKeys.PROVINCE]) {
      allRows.push({ connectCode: row[SpreadsheetColumnKeys.CONNECT_CODE], province: row[SpreadsheetColumnKeys.PROVINCE] , city: row[SpreadsheetColumnKeys.CITY] || '' });
    } else {
      console.log('Error loading player data:', row[SpreadsheetColumnKeys.CONNECT_CODE], row[SpreadsheetColumnKeys.PROVINCE]);
    }
  }

  return allRows;
}

const getPlayers = async () => {
  const spreadsheetData = await getPlayerSpreadsheetData();

  console.log(`Found ${spreadsheetData.length} player codes`)
  const allUniqueSpreadsheetData = uniq(spreadsheetData, 'connectCode');
  const allData = allUniqueSpreadsheetData.map(playerData => getPlayerDataThrottled(playerData.connectCode))

  const results = await Promise.all(allData.map(p => p.catch(e => e)));
  const validResults = results.filter(result => !(result instanceof Error));
  const unsortedPlayers = validResults
    .filter((data: any) => data?.data?.getConnectCode?.user)
    .map((data: any) => data.data.getConnectCode.user);

  
  const unsortedPlayersWithRegionData = unsortedPlayers.map(player => {
    const matchingPlayerData = spreadsheetData.find(playerRow => player.connectCode.code === playerRow.connectCode);

    if (matchingPlayerData) {
      return {
        ...player,
        region: {
          province: matchingPlayerData.province,
          city: matchingPlayerData.city,
        },
      }
    }

    return player;
  })

  const sortedPlayers = unsortedPlayersWithRegionData.sort((p1, p2) =>
  p2.rankedNetplayProfile.ratingOrdinal - p1.rankedNetplayProfile.ratingOrdinal);

  return sortedPlayers;
}

async function main() {
  console.log('Starting player fetch.');
  const players = await getPlayers();
  if(!players.length) {
    console.log('Error fetching player data. Terminating.')
    return
  }
  console.log('Player fetch complete.');
  // rename original to players-old
  const newFile = path.join(__dirname, 'data/players-new.json')
  const oldFile = path.join(__dirname, 'data/players-old.json')
  const timestamp = path.join(__dirname, 'data/timestamp.json')

  await fs.rename(newFile, oldFile)
  console.log('Renamed existing data file.');
  await fs.writeFile(newFile, JSON.stringify(players));
  await fs.writeFile(timestamp, JSON.stringify({updated: Date.now()}));
  console.log('Wrote new data file and timestamp.');
  console.log('Deploying.');
  const rootDir = path.normalize(path.join(__dirname, '..'))
  console.log(rootDir)
  // if no current git changes
  const { stdout, stderr } = await execPromise(`git -C ${rootDir} status --porcelain`);
  if(stdout || stderr) {
    console.log('Pending git changes... aborting deploy');
    return
  }
  const { stdout: stdout2, stderr: stderr2 } = await execPromise(`npm run --prefix ${rootDir} deploy`);
  console.log(stdout2);
  if(stderr2) {
    console.error(stderr2);
  }
  console.log('Deploy complete.');
}

main();
