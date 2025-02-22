import React, { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import ListSubheader from "@mui/material/ListSubheader";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import VisibilityIcon from '@mui/icons-material/Visibility'
import { DataLogValueInfo, Task, TimeLog } from "isoxml";

import { getTimeLogsWithData, TIMELOG_COLOR_SCALE } from "../../utils";
import {
    getISOXMLManager,
    getMergedTimeLogInfo,
    getMergedTimeLogValuesRange,
    getTimeLogInfo,
    getTimeLogValuesRange,
    parseAllTaskTimeLogs,
    parseTimeLog
} from "../../commonStores/isoxmlFileInfo";
import {
    excludedMergedTimeLogsSelector,
    setExcludeOutliers,
    setFillMissingOutliers,
    setTimeLogValue,
    setTimeLogVisibility,
    timeLogExcludeOutliersSelector,
    timeLogFillMissingValuesSelector,
    timeLogSelectedValueSelector,
    timeLogVisibilitySelector,
    toggleExcludeMergedTimeLog
} from "../../commonStores/visualSettings";
import { fitBounds } from "../../commonStores/map";
import { AppDispatch, RootState } from "../../store";

import { EntityTitle } from "./EntityTitle";
import { ValueDataPalette } from "./ValueDataPalette";

interface TimeLogEntityProps {
    timeLogId: string // it's taskId for merged TimeLogs
    isMergedTimeLog: boolean
}

const renderMenuItem = (valueInfo: DataLogValueInfo) => (
    <MenuItem
        sx={{
            flexDirection: 'column',
            alignItems: 'start',
            color: valueInfo.isProprietary ? '#673ab7': 'initial'
        }}
        key={valueInfo.valueKey}
        value={valueInfo.valueKey}
    >
        <Box sx={{ overflowX: 'hidden', textOverflow: 'ellipsis' }}>{
            valueInfo.DDEntityName
                ? `DDI: 0x${valueInfo.DDIString}\u2002${valueInfo.DDEntityName}`
                : `DDI 0x${valueInfo.DDIString}`
        }</Box>
        <Box sx={{ overflowX: 'hidden', textOverflow: 'ellipsis' }}>
            {valueInfo.deviceElementDesignator || `Device ${valueInfo.deviceElementId}`}
        </Box>
    </MenuItem>
)

const TimeLogCheckbox = ({label, checked, onChange}: {
    label: string,
    checked: boolean,
    onChange: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void
}) => (
    <FormControlLabel
        sx={{fontSize: '0.9rem'}}
        componentsProps={{typography: {variant: 'body2'}}}
        control={ <Checkbox
            sx={{py: 0.125}}
            checked={checked}
            onChange={onChange}
            color="primary"
            size="small"
        /> }
        label={label}
    />
)

const RealTimeLog = ({title, visible, disabled, timeLogId, onVisibilityClick}: {
    title: string,
    visible: boolean,
    disabled: boolean,
    timeLogId: string
    onVisibilityClick: (timeLogId: string) => void
}) => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                pointerEvents: disabled ? 'none' : 'initial',
                cursor: disabled ? 'initial' : 'pointer',
                opacity: disabled ? 0.5 : 1
            }}
            onClick={() => onVisibilityClick(timeLogId)}
        >
            <VisibilityIcon
                sx={{width: '20px', height: '20px'}}
                color={visible  && !disabled ? 'primary' : 'disabled'}
            />
            <Typography display="inline" sx={{flexGrow: 1, fontSize: '12px'}}>{title}</Typography>
        </Box>
    )
}

export function TimeLogEntity({ timeLogId, isMergedTimeLog }: TimeLogEntityProps) {
    const dispatch: AppDispatch = useDispatch()

    const isVisible = useSelector((state: RootState) => timeLogVisibilitySelector(state, timeLogId))
    const excludeOutliers = useSelector((state: RootState) => timeLogExcludeOutliersSelector(state, timeLogId))
    const fillMissingValues = useSelector((state: RootState) => timeLogFillMissingValuesSelector(state, timeLogId))
    const selectedValueKey = useSelector((state: RootState) => timeLogSelectedValueSelector(state, timeLogId))
    const excludedMergedTimeLogs = useSelector((state: RootState) =>
        isMergedTimeLog ? excludedMergedTimeLogsSelector(state, timeLogId) : undefined
    )

    const handleVisibilityClick = useCallback(() => {
        isMergedTimeLog
            ? parseAllTaskTimeLogs(timeLogId, fillMissingValues)
            : parseTimeLog(timeLogId, fillMissingValues)
        dispatch(setTimeLogVisibility({timeLogId, visible: !isVisible}))
    }, [dispatch, timeLogId, isVisible, fillMissingValues, isMergedTimeLog])

    const handleZoomToClick = useCallback(() => {
        isMergedTimeLog
            ? parseAllTaskTimeLogs(timeLogId, fillMissingValues)
            : parseTimeLog(timeLogId, fillMissingValues)
        const updatedTimeLogInfo = isMergedTimeLog ? getMergedTimeLogInfo(timeLogId) : getTimeLogInfo(timeLogId)
        const bbox = updatedTimeLogInfo.bbox
        if (bbox.every(pos => isFinite(pos))) {
            dispatch(fitBounds([...updatedTimeLogInfo.bbox]))
        }
        dispatch(setTimeLogVisibility({timeLogId, visible: true}))
    }, [dispatch, timeLogId, fillMissingValues, isMergedTimeLog])

    const handleValueChange = useCallback((event) => {
        dispatch(setTimeLogValue({timeLogId, valueKey: event.target.value}))
    }, [dispatch, timeLogId])

    const handleExcludeOutlier = useCallback(event => {
        dispatch(setExcludeOutliers({timeLogId, exclude: event.target.checked}))
    }, [dispatch, timeLogId])

    const handleFillMissingValues = useCallback(event => {
        dispatch(setFillMissingOutliers({timeLogId, fill: event.target.checked}))
    }, [dispatch, timeLogId])

    const handleExcludeMergedTimeLog = useCallback(timeLogIdToExclude => {
        dispatch(toggleExcludeMergedTimeLog({taskId: timeLogId, timeLogId: timeLogIdToExclude}))
    }, [dispatch, timeLogId])

    const timeLogInfo = useMemo(
        () => {
            if (!isVisible) {
                return
            }

            return isMergedTimeLog
                ? getMergedTimeLogInfo(timeLogId)
                : getTimeLogInfo(timeLogId)
        },
        [isVisible, timeLogId, isMergedTimeLog]
    )

    const valuesInfo: DataLogValueInfo[] = useMemo(() => {
        if (!isVisible) {
            return []
        }
        return timeLogInfo.valuesInfo.filter(
            valueInfo => valueInfo.minValue !== undefined
        )

    }, [timeLogInfo, isVisible])

    const parsingWarnings = timeLogInfo?.parsingErrors || []

    const standardValuesInfo = valuesInfo.filter(valueInfo => !valueInfo.isProprietary)
    const proprietaryValuesInfo = valuesInfo.filter(valueInfo => valueInfo.isProprietary)

    const {selectedValueInfo, min, max} = useMemo(() => {
        if (!isVisible || !selectedValueKey) {
            return {}
        }
        const selectedValueInfo = valuesInfo.find(info => info.valueKey === selectedValueKey)

        if (selectedValueInfo) {
            const {minValue, maxValue} = isMergedTimeLog
                ? getMergedTimeLogValuesRange(timeLogId, selectedValueInfo.valueKey, excludeOutliers)
                : getTimeLogValuesRange(timeLogId, selectedValueInfo.valueKey, excludeOutliers)
            return {selectedValueInfo, min: minValue, max: maxValue}
        }

        return {}

    }, [isVisible, selectedValueKey, valuesInfo, isMergedTimeLog, timeLogId, excludeOutliers])

    let realTimeLogs: TimeLog[] = []
    if (isMergedTimeLog) {
        const task = getISOXMLManager().getEntityByXmlId<Task>(timeLogId)
        realTimeLogs = getTimeLogsWithData(task)
    }

    return (<>
        <EntityTitle
            title={isMergedTimeLog ? 'Merged TimeLog' : `TimeLog ${timeLogId}`}
            onVisibilityClick={handleVisibilityClick}
            onZoomToClick={handleZoomToClick}
            isVisible={isVisible}
            warnings={parsingWarnings}
        />
        {isVisible && valuesInfo.length > 0 && selectedValueInfo && (
            <Box sx={{pb: 2}}>
                <FormControl size='small' variant='standard' sx={{width: '100%'}}>
                    <Select
                        MenuProps={{transitionDuration: 0}}
                        sx={{ width: '100%', fontSize: '0.9rem', fontStyle: 'italic' }}
                        value={selectedValueInfo.valueKey}
                        onChange={handleValueChange}
                    >
                        {standardValuesInfo.map(renderMenuItem)}
                        {proprietaryValuesInfo.length > 0 && (
                            <ListSubheader>
                                <Divider>
                                    <Typography sx={{my: 2}}>
                                        Proprietary TimeLog values
                                    </Typography>
                                </Divider>
                            </ListSubheader>
                        )}
                        {proprietaryValuesInfo.map(renderMenuItem)}
                    </Select>
                </FormControl>
                <ValueDataPalette
                    valueInfo={selectedValueInfo}
                    min={min}
                    max={max}
                    palette={TIMELOG_COLOR_SCALE}
                />
                <TimeLogCheckbox
                    checked={excludeOutliers}
                    onChange={handleExcludeOutlier}
                    label="Exclude outliers"
                />
                <TimeLogCheckbox
                    checked={fillMissingValues}
                    onChange={handleFillMissingValues}
                    label="Fill missing values"
                />
                {timeLogInfo.timeLogs.map((info, ind) => (
                    <div className="input-label" key={ind}>
                        <pre>
                            <small>
                                <b>{ind} {'=>'} </b>
                                {JSON.stringify(info, null, 2)}
                            </small>
                        </pre>
                    </div>
                ))}
                {isMergedTimeLog && (
                    <Box sx={{ml: 1, mt: 0.5}}>
                        {realTimeLogs.map(timeLog => {
                            const timeLogId = timeLog.attributes.Filename
                            const timeLogInfo = getTimeLogInfo(timeLogId)
                            const valueInfo = timeLogInfo.valuesInfo.find(
                                info => info.valueKey === selectedValueInfo.valueKey
                            )
                            const disabled = valueInfo?.minValue === undefined
                            return (
                                <RealTimeLog
                                    key={timeLogId}
                                    timeLogId={timeLogId}
                                    title={`TimeLog ${timeLogId}`}
                                    visible={excludedMergedTimeLogs[timeLogId] !== true}
                                    disabled={disabled}
                                    onVisibilityClick={handleExcludeMergedTimeLog}
                                />
                            )
                        })}
                    </Box>
                )}
            </Box>
        )}
        {isVisible && valuesInfo.length === 0 && (
            <Typography variant='body2' sx={{pb: 2, fontStyle: 'italic'}}>
                No TimeLog records with valid positions
            </Typography>
        )}
    </>)
}
