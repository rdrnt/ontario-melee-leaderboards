import React, { useEffect, useState } from 'react';
import { Table } from '../../Table';
import { Player } from '../../../lib/player'
import playersOld from '../../../../cron/data/players-old.json';
import playersNew from '../../../../cron/data/players-new.json';
import timestamp from '../../../../cron/data/timestamp.json';
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime' // import plugin
import * as settings from '../../../../settings'
import { ALL_PROVINCES } from '../../../lib/provinces';
dayjs.extend(relativeTime)


const setCount = (player: Player) => {
  return player.rankedNetplayProfile.wins +
    player.rankedNetplayProfile.losses;
}

const sortAndPopulatePlayers = (players: Player[]) => {
  players = players.filter((p)=> setCount(p))
    .concat(players.filter((p)=> !setCount(p)));
  players.forEach((player: Player, i: number) => {
    if(setCount(player) > 0) {
      player.rankedNetplayProfile.rank = i + 1
    }
  })
  return players
}

export default function HomePage() {

  // continuously update
  const updatedAt = dayjs(timestamp.updated);
  const [updateDesc, setUpdateDesc] = useState(updatedAt.fromNow())

  // filtering
  const [regionFilter, setRegionFilter] = React.useState('ALL');

  const players = React.useMemo(() => {
    const rankedPlayersOld = sortAndPopulatePlayers(playersOld)
      const oldPlayersMap = new Map(
        rankedPlayersOld.map((p) => [p.connectCode.code, p]));
  
      const players = sortAndPopulatePlayers(playersNew);
      players.forEach((p) => {
        const oldData = oldPlayersMap.get(p.connectCode.code)
        if(oldData) {
          p.oldRankedNetplayProfile = oldData.rankedNetplayProfile
        }
      })

    if (regionFilter !== 'ALL') {
      const playersByRegion = players.filter(player => player.region.province === regionFilter);
      return playersByRegion;
    }

    return players;
  }, [regionFilter]);

  return (
    <div className="flex flex-col items-center h-screen p-8">
      <h1 className="text-5xl m-4 text-center text-white font-medium">
        {settings.title}
      </h1>

    <div className="mt-2">
      <label className="mr-3 text-white">Filter by region:</label>
      <select className="bg-slate-50 rounded py-1 px-1" onChange={(event) => {
        // console.log('Value', event.target.value);
        setRegionFilter(event.target.value);
      }}>
        <option value="ALL">All</option>
        {ALL_PROVINCES.map(province => (
          <option key={province} value={province}>{province}</option>
        ))}
      </select>
    </div>

    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4">
        <a href="https://docs.google.com/forms/d/1hrqZNXV248bKtxPKVKQv1dlevI0_IPREkNypKmarVA8" target="_blank" rel="noreferrer">
          Submit your profile
        </a>
      </button>

      <div className="p-4 text-gray-300 flex flex-col items-center">
        <div>Created by <a href="https://www.twitter.com/_drnt" target="_blank" rel="noreferrer"
             className="text-gray-400 hover:text-indigo-700 mr-2 hover:underline">d r n t</a></div>

        <div className="text-gray-300 text-sm text-center">Last updated: {updateDesc}. Updates every morning & night.</div>

        <div className="text-gray-300 mt-2 text-sm text-center"><br />
        Fork of <a href="https://github.com/Grantismo/CoSlippiLeaderboard" target="_blank" rel="noreferrer"
             className="text-gray-400 hover:text-indigo-700 mr-2 hover:underline">
            Grantismo/CoSlippiLeaderboard
        </a></div>
      
      </div>

      { /* The player table */}
      <Table players={players} />
    </div>
  );
}
