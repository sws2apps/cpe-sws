import { useRecoilValue } from 'recoil';
import { useTranslation } from 'react-i18next';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { weekTypeLocalState } from '../../appStates/appSourceMaterial';

const WeekType = (props) => {
	const { t } = useTranslation();

	const { weekType, setWeekType } = props;

	const weekTypeList = useRecoilValue(weekTypeLocalState);

	const handleTypeChange = async (e) => {
		setWeekType(e.target.value);
		if (e.target.value === 3) {
			props.setHasMeeting(false);
		} else {
			props.setHasMeeting(true);
		}
	};

	const renderWeekType = (type) => {
		return (
			<MenuItem key={type.value} value={type.value}>
				{type.label}
			</MenuItem>
		);
	};

	return (
		<>
			{weekTypeList.length > 0 && (
				<TextField
					id='outlined-select-weekType'
					select
					label={t('global.type')}
					size='small'
					value={weekType}
					onChange={(e) => handleTypeChange(e)}
					sx={{
						minWidth: '140px',
						margin: '5px 5px 10px 0',
					}}
				>
					{weekTypeList.map((weekType) => renderWeekType(weekType))}
				</TextField>
			)}
		</>
	);
};

export default WeekType;