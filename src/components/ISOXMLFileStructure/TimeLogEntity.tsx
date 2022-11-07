import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import { DataLogValueInfo } from "isoxml";

import { backgroundGradientFromPalette, TIMELOG_COLOR_SCALE } from "../../utils";
import { getTimeLogInfo, getTimeLogValuesRange, parseTimeLog } from "../../commonStores/isoxmlFileInfo";
import {
    setExcludeOutliers,
    setTimeLogValue,
    setTimeLogVisibility,
    timeLogExcludeOutliersSelector,
    timeLogSelectedValueSelector,
    timeLogVisibilitySelector
} from "../../commonStores/visualSettings";
import { fitBounds } from "../../commonStores/map";
import { AppDispatch } from "../../store";

import { EntityTitle } from "./EntityTitle";
import { ValueDataPalette } from "./ValueDataPalette";

const TIMELOG_BACKGROUND = backgroundGradientFromPalette(TIMELOG_COLOR_SCALE)

interface TimeLogEntityProps {
    timeLogId: string
}

export function TimeLogEntity({ timeLogId }: TimeLogEntityProps) {
    const dispatch: AppDispatch = useDispatch()

    const isVisible = useSelector(state => timeLogVisibilitySelector(state, timeLogId))
    const excludeOutliers = useSelector(state => timeLogExcludeOutliersSelector(state, timeLogId))
    const selectedValueKey = useSelector(state => timeLogSelectedValueSelector(state, timeLogId))

    const onVisibilityClick = useCallback(() => {
        parseTimeLog(timeLogId)
        dispatch(setTimeLogVisibility({timeLogId, visible: !isVisible}))
    }, [dispatch, timeLogId, isVisible])

    const onZoomToClick = useCallback(() => {
        parseTimeLog(timeLogId)
        const updatedTimeLogInfo = getTimeLogInfo(timeLogId)
        dispatch(fitBounds([...updatedTimeLogInfo.bbox]))
        dispatch(setTimeLogVisibility({timeLogId, visible: true}))
    }, [dispatch, timeLogId])

    const onValueChange = useCallback((event) => {
        dispatch(setTimeLogValue({timeLogId, valueKey: event.target.value}))
    }, [dispatch, timeLogId])

    const onExcludeOutlier = useCallback(event => {
        dispatch(setExcludeOutliers({timeLogId, exclude: event.target.checked}))
    }, [dispatch, timeLogId])

    let variableValuesInfo: DataLogValueInfo[] = []
    let selectedValueInfo: DataLogValueInfo = null
    let min: number
    let max: number
    if (isVisible) {
        const timeLogInfo = getTimeLogInfo(timeLogId)
        variableValuesInfo = timeLogInfo.valuesInfo.filter(
            valueInfo => 'minValue' in valueInfo && valueInfo.minValue !== valueInfo.maxValue
        )
        selectedValueInfo = variableValuesInfo
            .find(info => info.valueKey === selectedValueKey)

        const {minValue, maxValue} = getTimeLogValuesRange(timeLogId, selectedValueInfo.valueKey, excludeOutliers)
        min = minValue
        max = maxValue
    }

    return (<>
        <EntityTitle
            title={`TimeLog ${timeLogId}`}
            onVisibilityClick={onVisibilityClick}
            onZoomToClick={onZoomToClick}
            isVisible={isVisible}
        />
        {isVisible && variableValuesInfo.length > 0 && (
            <Box sx={{pb: 4}}>
                <FormControl size='small' variant='standard' sx={{width: '100%'}}>
                    <Select
                        sx={{ width: '100%', fontSize: '0.9rem', fontStyle: 'italic' }}
                        value={selectedValueInfo.valueKey}
                        onChange={onValueChange}
                    >
                        {variableValuesInfo.map(valueInfo => (
                            <MenuItem
                                sx={{ flexDirection: 'column', alignItems: 'start' }}
                                key={valueInfo.valueKey}
                                value={valueInfo.valueKey}
                            >
                                <Box sx={{ overflowX: 'hidden', textOverflow: 'ellipsis' }}>{
                                    valueInfo.DDEntityName
                                        ? `${valueInfo.DDEntityName} (DDI: ${valueInfo.DDIString})`
                                        : `DDI ${valueInfo.DDIString}`
                                }</Box>
                                <Box sx={{ overflowX: 'hidden', textOverflow: 'ellipsis' }}>
                                    {valueInfo.deviceElementDesignator || `Device ${valueInfo.deviceElementId}`}
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <ValueDataPalette
                    valueInfo={selectedValueInfo}
                    min={min}
                    max={max}
                    paletteSx={{ height: '16px', background: TIMELOG_BACKGROUND }}
                />
                <FormControlLabel
                    sx={{fontSize: '0.9rem'}}
                    componentsProps={{typography: {variant: 'body2'}}}
                    control={ <Checkbox
                        checked={excludeOutliers}
                        onChange={onExcludeOutlier}
                        color="primary"
                        size="small"
                    /> }
                    label="Exclude outliers"
                />
            </Box>
        )}
    </>)
}