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
        {`We've moved!`}
      </h1>

    <div className="mt-2 text-white">
      <p>We've moved too a new domain: <a href="https://rdrnt.github.io/canada-slippi-ranked-leaderboards/#/" target="_blank" rel="noreferrer"
             className="text-gray-400 hover:text-indigo-700 mr-2 hover:underline">rdrnt.github.io/canada-slippi-ranked-leaderboards/#/</a></p>
    </div>

    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4">
        <a href="https://rdrnt.github.io/canada-slippi-ranked-leaderboards/#/" target="_blank" rel="noreferrer">
          Take me there
        </a>
      </button>

      <div className="p-4 text-gray-300 flex flex-col items-center mt-6">
        <div>Created by <a href="https://www.twitter.com/_drnt" target="_blank" rel="noreferrer"
             className="text-gray-400 hover:text-indigo-700 mr-2 hover:underline">d r n t</a></div>
      </div>
    </div>
  );
}
