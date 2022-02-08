import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { makeStyles } from '@material-ui/core/styles'
import { WebMercatorViewport } from '@deck.gl/core'
import DeckGL from '@deck.gl/react'
import { ExtendedGrid, Task } from 'isoxml'
import { gridsVisibilitySelector, timeLogsSelectedValueSelector, timeLogsVisibilitySelector } from '../commonStores/visualSettings'
import { isoxmlFileGridsInfoSelector } from '../commonStores/isoxmlFile'
import ISOXMLGridLayer from '../mapLayers/GridLayer'
import { fitBoundsSelector } from '../commonStores/map'
import { convertValue, getGridValue, TIMELOG_COLOR_SCALE } from '../utils'
import {GeoJsonLayer } from '@deck.gl/layers'
import { OSMBasemap, OSMCopyright } from '../mapLayers/OSMBaseLayer'
import { getISOXMLManager, getTimeLogGeoJSON, getTimeLogsCache } from '../commonStores/isoxmlFileInfo'
import chroma from 'chroma-js'

const useStyles = makeStyles({
    tooltipBase: {
        backgroundColor: 'blue',
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 3,
        transform: 'translate(-50%, -50%)',
    },
    tooltip: {
        backgroundColor: 'white',
        border: '1px solid gray',
        position: 'absolute',
        transform: 'translate(-50%, -120%)',
        padding: 4,
        borderRadius: 4
    }
})

interface TooltipState {
    x: number, 
    y: number,
    value: string
}

export function Map() {
    const [tooltip, setTooltip] = useState<TooltipState>(null)

    const [initialViewState, setInitialViewState] = useState<any>({
        longitude: 9.5777866,
        latitude: 45.5277534,
        zoom: 13
    })

    const isoxmlManager = getISOXMLManager()
    const timeLogsCache = getTimeLogsCache()

    const fitBounds = useSelector(fitBoundsSelector)
    const visibleGrids = useSelector(gridsVisibilitySelector)
    const visibleTimeLogs = useSelector(timeLogsVisibilitySelector)
    const timeLogsSelectedValue = useSelector(timeLogsSelectedValueSelector)
    const gridsInfo = useSelector(isoxmlFileGridsInfoSelector)

    const gridLayers = Object.keys(visibleGrids)
        .filter(taskId => visibleGrids[taskId])
        .map(taskId => {
            const task = isoxmlManager.getEntityByXmlId<Task>(taskId)

            return new ISOXMLGridLayer(taskId, task.attributes.Grid[0] as ExtendedGrid, gridsInfo[taskId])
        })

    const timeLogLayers = Object.keys(visibleTimeLogs)
        .filter(key => visibleTimeLogs[key])
        .map(timeLogId => {
            const valueKey = timeLogsSelectedValue[timeLogId]
            const geoJSON = getTimeLogGeoJSON(timeLogId)
            const valuesInfo = timeLogsCache[timeLogId].valuesInfo.find(info => info.valueKey === valueKey)

            const palette = chroma.scale((TIMELOG_COLOR_SCALE.colors as any)()).domain([valuesInfo.minValue, valuesInfo.maxValue])

            return new GeoJsonLayer({
                id: timeLogId,
                data: {
                    ...geoJSON,
                    features: geoJSON.features.filter(feature => valueKey in feature.properties)
                },
                getFillColor: (point: any) => {
                    return palette(point.properties[valueKey] as number).rgb()
                },
                stroked: false,
                updateTriggers: {
                    getFillColor: [valueKey]
                },
                pointRadiusUnits: 'pixels',
                getPointRadius: 5,
                pickable: true
            })
        })
    
    const viewStateRef = useRef(null)

    const onViewStateChange = useCallback(e => {
        viewStateRef.current = e.viewState 
        setTooltip(null)
    }, [])

    const onMapClick = useCallback(pickInfo => {
        if (!pickInfo.layer) {
            setTooltip(null)
            return
        }

        if (pickInfo.layer instanceof ISOXMLGridLayer) {
            const pixel = pickInfo.bitmap.pixel
            const taskId = pickInfo.layer.id

            const task = isoxmlManager.getEntityByXmlId<Task>(taskId)

            const grid = task.attributes.Grid[0] as ExtendedGrid

            const value = getGridValue(grid, pixel[0], pixel[1])
            if (value) {
                const gridInfo = gridsInfo[taskId]
                const valueConverted = convertValue(value, gridInfo)
                setTooltip({
                    x: pickInfo.x,
                    y: pickInfo.y,
                    value: `${valueConverted} ${gridInfo.unit}`
                })
            } else {
                setTooltip(null)
            }
        } else if (pickInfo.layer instanceof GeoJsonLayer) {
            const timeLogId = pickInfo.layer.id
            const valueKey = timeLogsSelectedValue[timeLogId]
            const value = pickInfo.object.properties[valueKey]
            const timeLogInfo = timeLogsCache[timeLogId].valuesInfo.find(info => info.valueKey === valueKey)

            const valueConverted = convertValue(value, timeLogInfo)

            setTooltip({
                x: pickInfo.x,
                y: pickInfo.y,
                value: `${valueConverted} ${timeLogInfo.unit}`
            })
        } else {
            setTooltip(null)
        }
    }, [isoxmlManager, gridsInfo, timeLogsSelectedValue, timeLogsCache])

    useEffect(() => {
        if (fitBounds) {
            const viewport = new WebMercatorViewport(viewStateRef.current)
            const {longitude, latitude, zoom} = viewport.fitBounds(
                [fitBounds.slice(0, 2), fitBounds.slice(2, 4)],
                {padding: 8}
            ) as any
            setInitialViewState({
                longitude,
                latitude,
                zoom: Math.min(20, zoom),
                pitch: 0,
                bearing: 0,
                __triggerUpdate: Math.random() // This property is used to force DeckGL to update the viewState
            })
            setTooltip(null)
        }
    }, [fitBounds])

    const classes = useStyles()

    return (<>
        <DeckGL
            initialViewState={initialViewState}
            controller={true}
            layers={[OSMBasemap, ...gridLayers, ...timeLogLayers]}
            onViewStateChange={onViewStateChange}
            onClick={onMapClick}
        >
            <OSMCopyright />
            {tooltip && (<>
                <div className={classes.tooltipBase} style={{left: tooltip.x, top: tooltip.y}}/>
                <div className={classes.tooltip} style={{left: tooltip.x, top: tooltip.y}}>
                    {tooltip.value}
                </div>
            </>)}
        </DeckGL>
    </>)
}