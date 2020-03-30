import {
    Color, GraphType, MapType, ShowType, Size, TableMode, DeliveryData, StationData
  } from '../data.model';
import { List, Map } from 'immutable';

export class Constants {
    private static readonly STATION_DATA: StationData = {
        id: null,
        name: null,
        lat: null,
        lon: null,
        incoming: null,
        outgoing: null,
        connections: null,
        invisible: null,
        contained: null,
        contains: null,
        groupType: null,
        selected: null,
        observed: null,
        outbreak: null,
        crossContamination: null,
        killContamination: null,
        weight: null,
        forward: null,
        backward: null,
        score: null,
        commonLink: null,
        properties: null
    };

    private static readonly DELIVERY_DATA: DeliveryData = {
        id: null,
        name: null,
        lot: null,
        lotKey: null,
        date: null,
        source: null,
        target: null,
        originalSource: null,
        originalTarget: null,
        invisible: null,
        selected: null,
        crossContamination: null,
        killContamination: null,
        observed: null,
        weight: null,
        forward: null,
        backward: null,
        score: null,
        properties: null
    };

    static readonly ARROW_STRING = '->';

    static readonly STATION_PROPERTIES = List(
        Object.keys(Constants.STATION_DATA)
    );
    static readonly DELIVERY_PROPERTIES = List(
        Object.keys(Constants.DELIVERY_DATA)
    );
    static readonly PROPERTIES: Map<string, { name: string; color: Color }> = Map(
        {
            id: { name: 'ID', color: null },
            name: { name: 'Name', color: null },
            lot: { name: 'Lot', color: null },
            date: { name: 'Date', color: null },
            source: { name: 'Source', color: null },
            target: { name: 'Target', color: null },
            originalSource: { name: 'Original Source', color: null },
            originalTarget: { name: 'Original Target', color: null },
            incoming: { name: 'Incoming', color: null },
            outgoing: { name: 'Outgoing', color: null },
            contains: { name: 'Contains', color: null },
            forward: { name: 'Forward Trace', color: { r: 150, g: 255, b: 75 } },
            backward: { name: 'Backward Trace', color: { r: 255, g: 150, b: 75 } },
            observed: { name: 'Observed', color: { r: 75, g: 150, b: 255 } },
            outbreak: { name: 'Outbreak', color: { r: 255, g: 50, b: 50 } },
            crossContamination: {
                name: 'Cross Contamination',
                color: { r: 150, g: 150, b: 150 }
            },
            commonLink: { name: 'Common Link', color: { r: 255, g: 255, b: 75 } },
            score: { name: 'Score', color: null }
        }
    );
    static readonly PROPERTIES_WITH_COLORS = List(
        Constants.PROPERTIES.filter(p => p.color != null).keys()
    );

    static readonly GRAPH_TYPES = List.of(GraphType.GRAPH, GraphType.GIS);
    static readonly TABLE_MODES = List.of(
        TableMode.STATIONS,
        TableMode.DELIVERIES
    );
    static readonly SHOW_TYPES = List.of(
        ShowType.ALL,
        ShowType.SELECTED_ONLY,
        ShowType.TRACE_ONLY
    );
    static readonly SIZES = List.of(Size.SMALL, Size.MEDIUM, Size.LARGE);

    static readonly DEFAULT_GRAPH_TYPE = GraphType.GRAPH;
    static readonly DEFAULT_MAP_TYPE = MapType.MAPNIK;
    static readonly DEFAULT_GRAPH_NODE_SIZE = Size.MEDIUM;
    static readonly DEFAULT_GRAPH_FONT_SIZE = Size.MEDIUM;
    static readonly DEFAULT_GRAPH_MERGE_DELIVERIES = false;
    static readonly DEFAULT_SKIP_UNCONNECTED_STATIONS = false;
    static readonly DEFAULT_GRAPH_SHOW_LEGEND = true;
    static readonly DEFAULT_GRAPH_SHOW_ZOOM = true;

    static readonly DEFAULT_TABLE_MODE = TableMode.STATIONS;
    static readonly DEFAULT_TABLE_WIDTH = 0.25;
    static readonly DEFAULT_TABLE_STATION_COLUMNS = List.of(
        'name',
        'country',
        'typeOfBusiness'
    );
    static readonly DEFAULT_TABLE_DELIVERY_COLUMNS = List.of(
        'id',
        'source',
        'target',
        'score'
    );
    static readonly DEFAULT_TABLE_SHOW_TYPE = ShowType.ALL;

    static readonly DELIVERYTABLE_LOTKEYCOLUMN = 'Product_k';
}
