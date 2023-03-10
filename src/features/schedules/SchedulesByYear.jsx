import { useCallback, useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import Box from '@mui/material/Box';
import { dbGetScheduleListByYear } from '../../indexedDb/dbSourceMaterial';
import { ScheduleCard } from './';
import { monthNamesState } from '../../states/main';
import { refreshWeeksListState } from '../../states/sourceMaterial';

const SchedulesByYear = ({ year }) => {
  const monthNames = useRecoilValue(monthNamesState);
  const refreshWeekList = useRecoilValue(refreshWeeksListState);

  const [schedules, setSchedules] = useState([]);

  const getMonthlySchedules = useCallback(async () => {
    const userSort = localStorage.getItem('monthSort');

    const data = await dbGetScheduleListByYear(year, userSort);
    let newData = [];
    for (const item of data) {
      const obj = {};
      obj.value = item.value;
      const monthIndex = parseInt(item.value.split('/')[0], 10);
      obj.label = `${monthNames[monthIndex - 1]} ${year}`;
      newData.push(obj);
    }
    setSchedules(newData);
  }, [monthNames, year]);

  useEffect(() => {
    getMonthlySchedules();
  }, [getMonthlySchedules, refreshWeekList]);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '15px', padding: '5px' }}>
      {schedules.map((schedule) => (
        <ScheduleCard key={schedule.value} schedule={schedule} />
      ))}
    </Box>
  );
};

export default SchedulesByYear;
