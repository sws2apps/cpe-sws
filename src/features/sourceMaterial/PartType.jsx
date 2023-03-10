import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { useTranslation } from 'react-i18next';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { assTypeAYFOnlyState } from '../../states/sourceMaterial';

const PartType = (props) => {
  const { t } = useTranslation('ui');

  const [type, setType] = useState('');

  const assTypeList = useRecoilValue(assTypeAYFOnlyState);

  const handleChangeType = (e) => {
    setType(e.target.value);
    if (props.ayf === 1) {
      props.setAss1Type(e.target.value);
    } else if (props.ayf === 2) {
      props.setAss2Type(e.target.value);
    } else if (props.ayf === 3) {
      props.setAss3Type(e.target.value);
    } else if (props.ayf === 4) {
      props.setAss4Type(e.target.value);
    }
  };

  const renderPartType = (type) => {
    return (
      <MenuItem key={type.value} value={type.value}>
        {type.label}
      </MenuItem>
    );
  };

  useEffect(() => {
    setType(props.assType);
  }, [props.assType]);

  return (
    <>
      {assTypeList.length > 0 && (
        <TextField
          id="outlined-select-type"
          select
          label={t('partType')}
          size="small"
          value={type}
          onChange={(e) => handleChangeType(e)}
          sx={{ minWidth: '250px' }}
        >
          <MenuItem value={''}>
            <em>{t('nothing')}</em>
          </MenuItem>
          {assTypeList.map((partType) => renderPartType(partType))}
        </TextField>
      )}
    </>
  );
};

export default PartType;
