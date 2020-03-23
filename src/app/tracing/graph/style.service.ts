import { Injectable } from '@angular/core';
import cytoscape from 'cytoscape';
import { GraphServiceData } from './graph.model';

interface Settings {
    nodeSize: number;
    fontSize: number;
    zoom: number;
}

enum GraphSize {
    SMALL, LARGE, HUGE
}

@Injectable({
    providedIn: 'root'
})
export class StyleService {
    private static readonly RENDERED_MIN_NODE_SIZE = 10;
    private static readonly RENDERED_MIN_EDGE_WIDTH = 0.5;
    private static readonly NODE_SIZE_TO_BORDER_WIDTH_FACTOR = 1 / 20;
    private static readonly NODE_SIZE_TO_EDGE_WIDTH_FACTOR = 1 / 75;
    private static readonly SELECTED_EDGE_WIDTH_FACTOR = 5;
    private static readonly META_NODE_BORDER_WIDTH_FACTOR = 2;
    private static readonly SELECTED_NODE_BORDER_WIDTH_FACTOR = 2;

    constructor() { }

    createCyStyle(settings: Settings, graphData: GraphServiceData): any {
        const graphSize = this.getProperGraphSize(graphData);
        return this.createXGraphStyle(graphSize, settings.zoom, settings.nodeSize, settings.fontSize, graphData.tracingResult.maxScore);
    }

    private getProperGraphSize(graphData: GraphServiceData): GraphSize {
        const MAX_STATION_NUMBER_FOR_SMALL_GRAPHS = 1000;
        const MAX_DELIVERIES_NUMBER_FOR_SMALL_GRAPHS = 3000;
        if (graphData.nodeData.length > MAX_STATION_NUMBER_FOR_SMALL_GRAPHS) {
            return GraphSize.HUGE;
        } else if (graphData.edgeData.length > MAX_DELIVERIES_NUMBER_FOR_SMALL_GRAPHS) {
            return GraphSize.LARGE;
        } else {
            return GraphSize.SMALL;
        }
    }

    private createNodeSizeStyle(defaultModelNodeSize: number, maxScore: number): { height: string, width: string } {
        const nodeSizeMap: string = this.createNodeSizeMap(defaultModelNodeSize, maxScore);
        return {
            height: nodeSizeMap,
            width: nodeSizeMap
        };
    }

    private createXGraphStyle(graphSize: GraphSize, zoom: number, nodeSize: number, fontSize: number, maxScore: number): any {

        const modelNodeSize = nodeSize / zoom; // this.getVisibleNodeSize(zoom, nodeSize);
        const edgeSize = nodeSize * StyleService.NODE_SIZE_TO_EDGE_WIDTH_FACTOR;
        const modelEdgeWidth = edgeSize / zoom; // this.getVisibleEdgeWidth(zoom, edgeSize);
        const modelSelectedEdgeWidth = modelEdgeWidth * StyleService.SELECTED_EDGE_WIDTH_FACTOR;
        const modelFontSize = fontSize / zoom; // Math.max(fontSize / zoom, fontSize);

        const style = cytoscape
            .stylesheet()
            .selector('*')
            .style({
                'overlay-color': 'rgb(0, 0, 255)',
                'overlay-padding': 10,
                'overlay-opacity': e => (e.scratch('_active') ? 0.5 : 0.0)
            })
            .selector('node')
            .style({
                ...(
                    graphSize !== GraphSize.HUGE ?
                    {
                        content: 'data(label)',
                        'text-valign': 'bottom',
                        'text-halign': 'right',
                        'text-wrap': 'none',
                        'font-size': modelFontSize
                    }
                    :
                    {}
                ),
                'shape': 'data(shape)',
                ...this.createNodeSizeStyle(modelNodeSize, maxScore),
                'background-fill' : 'linear-gradient',
                'background-gradient-stop-colors' : 'data(stopColors)',
                'background-gradient-stop-positions' : 'data(stopPositions)',
                'background-gradient-direction': 'to-right',
                'border-width': modelNodeSize * StyleService.NODE_SIZE_TO_BORDER_WIDTH_FACTOR,
                'border-color': 'rgb(0, 0, 0)',
                'z-index': 'data(zindex)',
                color: 'rgb(0, 0, 0)'
            })

            .selector('edge')
            .style({
                ...(
                    graphSize !== GraphSize.HUGE ?
                    {
                        content: 'data(label)',
                        'text-wrap': 'none',
                        'text-rotation': 'autorotate',
                        'font-size': modelFontSize
                    } :
                    {}
                ),
                'control-point-step-size': modelSelectedEdgeWidth * 4,
                'target-arrow-shape': 'triangle-cross',
                'target-arrow-color': 'rgb(0, 0, 0)',
                'curve-style': graphSize === GraphSize.SMALL ? 'bezier' : 'straight',
                'line-fill': 'linear-gradient',
                'line-gradient-stop-colors': 'data(stopColors)',
                'line-gradient-stop-positions': 'data(stopPositions)',
                width: this.createEdgeWidthMap(modelEdgeWidth, 2),   // modelEdgeWidth,
                'arrow-scale': this.createArrowScaleMap(1.4) // 1.4
            })

            .selector('node:selected')
            .style({
                'background-color': 'rgb(128, 128, 255)',
                'border-width': (
                    modelNodeSize *
                    StyleService.NODE_SIZE_TO_BORDER_WIDTH_FACTOR *
                    StyleService.SELECTED_NODE_BORDER_WIDTH_FACTOR
                ),
                'border-color': 'rgb(0, 0, 255)',
                color: 'rgb(0, 0, 255)'
            })
            .selector('edge:selected:inactive')
            .style({
                width: modelSelectedEdgeWidth,
                color: 'rgb(0, 0, 255)',
                'overlay-color': 'rgb(0, 0, 255)',
                'overlay-padding': modelSelectedEdgeWidth / 6.0,
                'overlay-opacity': 1,
                'target-arrow-color': 'rgb(0, 0, 255)'
            })
            .selector('edge[?wLabelSpace]')
            .style({
                ...(
                    graphSize !== GraphSize.HUGE ?
                    {
                        'control-point-step-size': modelFontSize * 2.5
                    } :
                    {}
                )
            })
            .selector('node[?isMeta]')
            .style({
                'border-width': (
                    modelNodeSize *
                    StyleService.NODE_SIZE_TO_BORDER_WIDTH_FACTOR *
                    StyleService.META_NODE_BORDER_WIDTH_FACTOR
                )
            })
            .selector('node:selected[?isMeta]')
            .style({
                'border-width': (
                    modelNodeSize *
                    StyleService.NODE_SIZE_TO_BORDER_WIDTH_FACTOR *
                    StyleService.META_NODE_BORDER_WIDTH_FACTOR *
                    StyleService.SELECTED_NODE_BORDER_WIDTH_FACTOR
                )
            })
            .selector(':active')
            .style({
                'overlay-opacity': 0.5
            });

        return style;
    }

    private createNodeSizeMap(defaultModelNodeSize: number, maxScore: number): string {
        if (maxScore > 0) {
            const minNodeSize = defaultModelNodeSize; // this.getVisibleNodeSize(zoom, defaultNodeSize / 1.2);
            const maxNodeSize = minNodeSize * 1.2 * 1.2;
            return 'mapData(score, 0, ' + maxScore + ', ' + minNodeSize + ',' + maxNodeSize + ')';
        } else {
            return defaultModelNodeSize.toString(); // this.getVisibleNodeSize(zoom, defaultNodeSize).toString();
        }
    }

    private createEdgeWidthMap(defaultModelEdgeWidth: number, maxWidth: number): string | number {
        if (maxWidth) {
            const minModelEdgeWidth = defaultModelEdgeWidth; // this.getVisibleNodeSize(zoom, defaultNodeSize / 1.2);
            const maxModelEdgeWidth = minModelEdgeWidth * 1.2 * 1.2;
            return 'mapData(width, 1, ' + maxWidth + ', ' + minModelEdgeWidth + ',' + maxModelEdgeWidth + ')';
        } else {
            return defaultModelEdgeWidth; // this.getVisibleNodeSize(zoom, defaultNodeSize).toString();
        }
    }

    private createArrowScaleMap(arrowScale: number): string {
        return 'mapData(width, 1.4, ' + 1.5 + ', ' + 1.4 + ',' + 1.5 + ')';
    }
    // private getVisibleNodeSize(zoom: number, defaultNodeSize: number): number {
    //     return Math.max(defaultNodeSize, StyleService.RENDERED_MIN_NODE_SIZE / zoom);
    // }

    // private getVisibleEdgeWidth(zoom: number, defaultEdgeWidth: number): number {
    //     return Math.max(defaultEdgeWidth, StyleService.RENDERED_MIN_EDGE_WIDTH / zoom);
    // }
}
