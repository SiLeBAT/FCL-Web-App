import { MapType, ShapeFileData } from '../data.model';
import { OSM } from 'ol/source';
import * as ol from 'ol';
import BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import { Tile } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import { GeoJSON } from 'ol/format';
import { Stroke, Style } from 'ol/style';

export interface MapConfig {
    mapType: MapType;
    shapeFileData: ShapeFileData;
}

export interface FrameConfig {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
}

const LAYER_ID_KEY = 'layerId';
const MAP_LAYER_ID = 'MapLayer';
const FRAME_LAYER_ID = 'FrameLayer';

const MAP_SOURCE: Map<MapType, () => OSM> = new Map([
    [MapType.MAPNIK, () => new OSM()],
    [MapType.BLACK_AND_WHITE, () => new OSM({
        url: 'https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
        crossOrigin: null
    })]
]);

const availableMapTypes: MapType[] = [ MapType.MAPNIK, MapType.BLACK_AND_WHITE ];

export function getAvailableMapTypes(): MapType[] {
    return availableMapTypes;
}

export function createOpenLayerMap(mapConfig: MapConfig, target: HTMLElement): ol.Map {
    const map = new ol.Map({
        target: target,
        layers: [
            createMapLayer(mapConfig)
        ],
        controls: []
    });
    return map;
}

function createMapLayer(mapConfig: MapConfig): BaseLayer {
    const baseLayer = (
        mapConfig.mapType !== MapType.SHAPE_FILE ?
        createTileLayer(mapConfig) :
        createShapeFileLayer(mapConfig)
    );
    baseLayer.set(LAYER_ID_KEY, MAP_LAYER_ID, true);
    return baseLayer;
}

function createTileLayer(mapConfig: MapConfig): BaseLayer {
    return new Tile({
        source: MAP_SOURCE.get(mapConfig.mapType)()
    });
}

export function createShapeFileLayer(mapConfig: MapConfig): BaseLayer {
    const vectorSource = new VectorSource({
        features: (new GeoJSON()).readFeatures(mapConfig.shapeFileData)
    });

    const style = new Style({
        stroke: new Stroke({
            color: 'black',
            width: 0.5
        })
    });
    const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: style
    });
    return vectorLayer;
}

export function updateMapType(map: ol.Map, mapConfig: MapConfig): void {
    removeLayer(map, MAP_LAYER_ID);
    map.getLayers().insertAt(0, createMapLayer(mapConfig));
}

function removeLayer(map: ol.Map, layerId: string): void {
    const layers = map.getLayers().getArray().filter(layer => layer.get(LAYER_ID_KEY) === layerId);
    if (layers.length > 0) {
        map.removeLayer(layers[0]);
    }
}

export function removeFrameLayer(map: ol.Map) {
    removeLayer(map, FRAME_LAYER_ID);
}

export function setFrameLayer(map: ol.Map, frameConfig: FrameConfig): void {
    removeFrameLayer(map);
    map.addLayer(createFrameLayer(frameConfig));
}

function createFrameLayer(frameConfig: FrameConfig): BaseLayer {
    const polygon = new Style({
        stroke: new Stroke({
            color: 'rgba(255, 0, 0, 0.3)',
            width: 20
        })
    });

    const geojsonObject = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                id: 'polygon',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [frameConfig.xMin, frameConfig.yMax],
                        [frameConfig.xMin, frameConfig.yMin],
                        [frameConfig.xMax, frameConfig.yMin],
                        [frameConfig.xMax, frameConfig.yMax]
                    ]]
                }
            }
        ]
    };

    const vectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(geojsonObject)
    });

    const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: polygon
    });

    return vectorLayer;
}
