import { useCallback, useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import {
  currentScheduleState,
  currentWeekSchedState,
  dlgAutoFillOpenState,
  isAutoFillSchedState,
  reloadWeekSummaryState,
} from '../../states/schedule';
import { checkCBSReader, checkLCAssignments, dbGetSourceMaterial } from '../../indexedDb/dbSourceMaterial';
import { dbFetchScheduleInfo, dbGetScheduleData } from '../../indexedDb/dbSchedule';
import { dbSaveAss } from '../../indexedDb/dbAssignment';
import { dbGetAppSettings } from '../../indexedDb/dbAppSettings';
import { dbGetPersonsByAssType } from '../../indexedDb/dbPersons';
import { openingPrayerAutoAssignState } from '../../states/congregation';

const AutofillSchedule = () => {
  const { t } = useTranslation('ui');

  const [dlgAutofillOpen, setDlgAutofillOpen] = useRecoilState(dlgAutoFillOpenState);

  const setReloadWeekSummary = useSetRecoilState(reloadWeekSummaryState);

  const isAutofillSched = useRecoilValue(isAutoFillSchedState);
  const currentSchedule = useRecoilValue(currentScheduleState);
  const currentWeek = useRecoilValue(currentWeekSchedState);
  const autoAssignOpeningPrayer = useRecoilValue(openingPrayerAutoAssignState);

  const [totalToAssign, setTotalToAssign] = useState(0);
  const [assigned, setAssigned] = useState(0);
  const [isAssigning, setIsAssigning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [weeks, setWeeks] = useState([]);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway' || reason === 'backdropClick') {
      return;
    }
    setDlgAutofillOpen(false);
  };

  const fetchInfoToAssign = useCallback(async () => {
    const { weeks, total } = await dbFetchScheduleInfo(isAutofillSched, currentSchedule, currentWeek);
    setWeeks(weeks);
    setTotalToAssign(total);
  }, [currentSchedule, currentWeek, isAutofillSched]);

  const handleAssignSchedule = async () => {
    setIsAssigning(true);

    const { class_count } = await dbGetAppSettings();
    let students = [];

    // Assign Chairman
    for await (const item of weeks) {
      const week = item.value;
      const schedData = await dbGetScheduleData(week);

      if (schedData.noMeeting === false) {
        // Main Hall
        students = await dbGetPersonsByAssType(110);
        if (students.length > 0) {
          const chairmanA = students[0].person_uid;
          await dbSaveAss(week, chairmanA, 'chairmanMM_A');
          setAssigned((prev) => {
            return prev + 1;
          });

          if (autoAssignOpeningPrayer) {
            await dbSaveAss(week, chairmanA, 'opening_prayer');
            setAssigned((prev) => {
              return prev + 1;
            });
          }
        }

        // Aux Class
        if (class_count === 2 && schedData.week_type === 1) {
          students = await dbGetPersonsByAssType(110);
          if (students.length > 0) {
            const chairmanB = students[0].person_uid;
            await dbSaveAss(week, chairmanB, 'chairmanMM_B');
            setAssigned((prev) => {
              return prev + 1;
            });
          }
        }
      }
    }

    // Assign CBS Conductor
    for await (const item of weeks) {
      const week = item.value;
      const schedData = await dbGetScheduleData(week);

      if (schedData.noMeeting === false && schedData.week_type === 1) {
        // Conductor
        students = await dbGetPersonsByAssType(115);
        if (students.length > 0) {
          const cbsConductor = students[0].person_uid;
          await dbSaveAss(week, cbsConductor, 'cbs_conductor');
          setAssigned((prev) => {
            return prev + 1;
          });
        }
      }
    }

    for await (const item of weeks) {
      const week = item.value;
      const sourceData = await dbGetSourceMaterial(week);
      const schedData = await dbGetScheduleData(week);

      if (schedData.noMeeting === false) {
        // Assign TGW Talk
        students = await dbGetPersonsByAssType(112);
        if (students.length > 0) {
          const tgwTalk = students[0].person_uid;
          await dbSaveAss(week, tgwTalk, 'tgw_talk');
          setAssigned((prev) => {
            return prev + 1;
          });
        }

        // Assign TGW Spiritual Gems
        students = await dbGetPersonsByAssType(113);
        if (students.length > 0) {
          const tgwGems = students[0].person_uid;
          await dbSaveAss(week, tgwGems, 'tgw_gems');
          setAssigned((prev) => {
            return prev + 1;
          });
        }

        const noAssignLC1 = await checkLCAssignments(sourceData.lcPart1_src);
        if (!noAssignLC1) {
          // Assign LC Part 1
          students = await dbGetPersonsByAssType(114);
          if (students.length > 0) {
            const lcPart1 = students[0].person_uid;
            await dbSaveAss(week, lcPart1, 'lc_part1');
            setAssigned((prev) => {
              return prev + 1;
            });
          }
        }

        // Assign LC Part 2
        let isAssignLC2 = false;
        if (sourceData.lcCount_override === undefined && sourceData.lcCount === 2) {
          const noAssignLC2 = await checkLCAssignments(sourceData.lcPart2_src);
          isAssignLC2 = !noAssignLC2;
        }
        if (sourceData.lcCount_override !== undefined && sourceData.lcCount_override === 2) {
          const noAssignLC2 = await checkLCAssignments(sourceData.lcPart2_src_override);
          isAssignLC2 = !noAssignLC2;
        }

        if (isAssignLC2) {
          students = await dbGetPersonsByAssType(114);
          if (students.length > 0) {
            const lcPart2 = students[0].person_uid;
            await dbSaveAss(week, lcPart2, 'lc_part2');
            setAssigned((prev) => {
              return prev + 1;
            });
          }
        }

        // Assign CBS Reader
        if (schedData.week_type === 1) {
          const noAssignCBSReader = await checkCBSReader(sourceData.cbs_src);
          if (!noAssignCBSReader) {
            students = await dbGetPersonsByAssType(116);
            if (students.length > 0) {
              const cbsReader = students[0].person_uid;
              await dbSaveAss(week, cbsReader, 'cbs_reader');
              setAssigned((prev) => {
                return prev + 1;
              });
            }
          }
        }

        if (!autoAssignOpeningPrayer) {
          // Assign Opening Prayer
          students = await dbGetPersonsByAssType(111);
          if (students.length > 0) {
            const openingPrayer = students[0].person_uid;
            await dbSaveAss(week, openingPrayer, 'opening_prayer');
            setAssigned((prev) => {
              return prev + 1;
            });
          }
        }

        // Assign Closing Prayer
        students = await dbGetPersonsByAssType(111);
        if (students.length > 0) {
          const closingPrayer = students[0].person_uid;
          await dbSaveAss(week, closingPrayer, 'closing_prayer');
          setAssigned((prev) => {
            return prev + 1;
          });
        }

        // Assign Bible Reading Main Hall
        students = await dbGetPersonsByAssType(100);
        if (students.length > 0) {
          const stuBReadA = students[0].person_uid;
          await dbSaveAss(week, stuBReadA, 'bRead_stu_A');
          setAssigned((prev) => {
            return prev + 1;
          });
        }

        // Assign Bible Reading Aux Class
        if (class_count === 2 && schedData.week_type === 1) {
          students = await dbGetPersonsByAssType(100);
          if (students.length > 0) {
            const stuBReadB = students[0].person_uid;
            await dbSaveAss(week, stuBReadB, 'bRead_stu_B');
            setAssigned((prev) => {
              return prev + 1;
            });
          }
        }

        // Assign AYF Student
        let fldName = '';
        let fldType = '';

        for await (const a of [1, 2, 3]) {
          fldType = 'ass' + a + '_type';
          const assType = sourceData[fldType];

          // Main Hall
          if (
            assType === 101 ||
            assType === 102 ||
            assType === 103 ||
            assType === 104 ||
            assType === 108 ||
            (assType >= 140 && assType < 170) ||
            (assType >= 170 && assType < 200)
          ) {
            fldName = 'ass' + a + '_stu_A';
            students = await dbGetPersonsByAssType(assType);

            if (students.length > 0) {
              const stuA = students[0].person_uid;
              await dbSaveAss(week, stuA, fldName);
              setAssigned((prev) => {
                return prev + 1;
              });
            }
          }

          // Aux Class
          if (class_count === 2 && schedData.week_type === 1) {
            fldName = 'ass' + a + '_stu_B';
            students = await dbGetPersonsByAssType(assType);

            if (
              assType === 101 ||
              assType === 102 ||
              assType === 103 ||
              assType === 104 ||
              assType === 108 ||
              (assType >= 140 && assType < 170) ||
              (assType >= 170 && assType < 200)
            ) {
              if (students.length > 0) {
                const stuB = students[0].person_uid;
                await dbSaveAss(week, stuB, fldName);
                setAssigned((prev) => {
                  return prev + 1;
                });
              }
            }
          }
        }

        // Assign AYF Assistant
        for await (const a of [1, 2, 3]) {
          fldType = 'ass' + a + '_type';
          const assType = sourceData[fldType];

          // Main Hall
          if (
            assType === 101 ||
            assType === 102 ||
            assType === 103 ||
            assType === 108 ||
            (assType >= 140 && assType < 170) ||
            (assType >= 170 && assType < 200)
          ) {
            fldName = 'ass' + a + '_stu_A_dispName';
            const stuDispA = schedData[fldName];

            fldName = 'ass' + a + '_ass_A';
            students = await dbGetPersonsByAssType('isAssistant', stuDispA);
            if (students.length > 0) {
              const assA = students[0].person_uid;
              await dbSaveAss(week, assA, fldName);
              setAssigned((prev) => {
                return prev + 1;
              });
            }
          }

          // Aux Class
          if (class_count === 2 && schedData.week_type === 1) {
            if (
              assType === 101 ||
              assType === 102 ||
              assType === 103 ||
              assType === 108 ||
              (assType >= 140 && assType < 170) ||
              (assType >= 170 && assType < 200)
            ) {
              fldName = 'ass' + a + '_stu_B_dispName';
              const stuDispB = schedData[fldName];

              fldName = 'ass' + a + '_ass_B';
              students = await dbGetPersonsByAssType('isAssistant', stuDispB);
              if (students.length > 0) {
                const assB = students[0].person_uid;
                await dbSaveAss(week, assB, fldName);
                setAssigned((prev) => {
                  return prev + 1;
                });
              }
            }
          }
        }
      }
    }

    setReloadWeekSummary((prev) => {
      return !prev;
    });

    setTimeout(() => {
      setIsAssigning(false);
      setDlgAutofillOpen(false);
    }, [1000]);
  };

  useEffect(() => {
    fetchInfoToAssign();
  }, [fetchInfoToAssign]);

  useEffect(() => {
    const vPg = (assigned * 100) / totalToAssign;
    setProgress(vPg);
  }, [assigned, totalToAssign]);

  return (
    <Box>
      <Dialog open={dlgAutofillOpen} aria-labelledby="dialog-title-autofill-assignment" onClose={handleClose}>
        <DialogTitle id="dialog-title-autofill-assignment">
          <Typography variant="h6" component="p">
            {t('autofill')}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {isAutofillSched && (
            <Typography>
              {t('autofillScheduleConfirm', {
                currentSchedule: currentSchedule.label,
              })}
            </Typography>
          )}
          {!isAutofillSched && (
            <Typography>
              {t('autofillWeekConfirm', {
                currentWeek: currentWeek.label,
              })}
            </Typography>
          )}

          {isAssigning && (
            <Box
              sx={{
                display: 'flex',
                gap: '3px',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '20px',
              }}
            >
              <LinearProgress color="success" variant="determinate" value={progress} sx={{ width: '100%' }} />
              <Typography sx={{ fontWeight: 'bold', marginLeft: '25px' }}>{`${assigned}/${totalToAssign}`}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary" autoFocus disabled={isAssigning}>
            {t('no')}
          </Button>
          <Button autoFocus onClick={handleAssignSchedule} color="primary" disabled={isAssigning}>
            {t('autofill')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutofillSchedule;
