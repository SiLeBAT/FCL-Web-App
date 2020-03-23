import { Injectable } from '@angular/core';
import { BasicGraphState, DeliveryData, DataServiceData, ObservedType, NodeShapeType, MergeDeliveriesType } from '../data.model';
import { DataService } from '../services/data.service';
import { CyNodeData, CyEdgeData, GraphServiceData } from './graph.model';
import { Utils } from '../util/non-ui-utils';
import * as _ from 'lodash';
import { EdgeLabelOffsetUpdater } from './edge-label-offset-updater';

interface CyDataNodes {
    statIdToNodeDataMap: {[key: string]: CyNodeData };
    nodeData: CyNodeData[];
    nodeSel: { [key: string]: boolean };
    idToNodeMap?: { [key: string]: CyNodeData };
}

interface CyDataEdges {
    delIdToEdgeDataMap: {[key: string]: CyEdgeData };
    edgeData: CyEdgeData[];
    edgeSel: { [key: string]: boolean };
}

interface GraphState extends BasicGraphState {
    mergeDeliveriesType: MergeDeliveriesType;
    showMergedDeliveriesCounts: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class GraphService {

    private static readonly DEFAULT_EDGE_COLOR = [0, 0, 0];
    private static readonly DEFAULT_NODE_COLOR = [255, 255, 255];

    private cachedState: GraphState;

    private cachedData: GraphServiceData;

    static updateRelZindex(nodeData: CyNodeData[]) {
        nodeData = nodeData.slice();
        nodeData.sort((n1, n2) => (
            n1.station.score !== n2.station.score ?
            (n1.station.score < n2.station.score ? -1 : 1) :
            (n1.degree !== n2.degree ? (n1.degree < n2.degree ? -1 : 1) : 0)
        ));
        nodeData.forEach((n, i) => {
            n.relZindex = i;
        });
        this.updateAbsZindex(nodeData);
    }

    static updateAbsZindex(nodeData: CyNodeData[]) {
        const nNodes = nodeData.length;
        nodeData.forEach(n => n.zindex = n.relZindex + (n.selected ? nNodes : 0));
    }

    constructor(
        private dataService: DataService
    ) {}

    getData(state: GraphState): GraphServiceData {
        this.applyState(state);
        return { ...this.cachedData };
    }

    private createNodeData(state: GraphState, data: DataServiceData): CyDataNodes {
        let iNode = 0;
        const nodeData: CyNodeData[] = data.stations.filter(s => !s.invisible && !s.contained).map(s => ({
            id: 'N' + iNode++,
            label: s.highlightingInfo.label.join(' / ').replace(/\s+/, ' '),
            ...this.getColorInfo(s.highlightingInfo.color, GraphService.DEFAULT_NODE_COLOR),
            isMeta: s.contains && s.contains.length > 0,
            shape: s.highlightingInfo.shape ? s.highlightingInfo.shape : NodeShapeType.CIRCLE,
            station: s,
            score: s.score,
            forward: s.forward,
            backward: s.backward,
            outbreak: s.outbreak,
            crossContamination: s.crossContamination,
            commonLink: s.commonLink,
            killContamination: s.killContamination,
            selected: s.selected,
            observed: s.observed,
            weight: s.weight
        }));

        return {
            nodeData: nodeData,
            statIdToNodeDataMap: Utils.createObjectMap(nodeData, (n) => n.station.id),
            nodeSel: Utils.createStringSet(nodeData.filter(n => n.selected).map(n => n.id)),
            idToNodeMap: Utils.createObjectMap(nodeData, (n) => n.id)
        };
    }

    private createEdgeData(state: GraphState, data: DataServiceData, cyDataNodes: CyDataNodes): CyDataEdges {

        const edgeData: CyEdgeData[] = [];

        const sourceTargetDelMap: { [key: string]: { [key: string]: DeliveryData[] }} = {};

        const statMap = cyDataNodes.statIdToNodeDataMap;
        const selDel = Utils.createStringSet(state.selectedElements.deliveries);

        if (state.mergeDeliveriesType !== MergeDeliveriesType.NO_MERGE) {

            for (const delivery of data.deliveries.filter(d => !d.invisible)) {
                const sourceData = statMap[delivery.source];
                const targetData = statMap[delivery.target];
                if (sourceData && targetData) {
                    let targetMap = sourceTargetDelMap[sourceData.id];
                    if (!targetMap) {
                        targetMap = { [targetData.id]: [delivery] };
                        sourceTargetDelMap[sourceData.id] = targetMap;
                    } else {
                        const deliveries = targetMap[targetData.id];
                        if (!deliveries) {
                            targetMap[targetData.id] = [delivery];
                        } else {
                            deliveries.push(delivery);
                        }
                    }
                }
            }
            let iEdge = 0;
            for (const sourceDataId of Object.keys(sourceTargetDelMap)) {
                const targetMap = sourceTargetDelMap[sourceDataId];
                for (const targetDataId of Object.keys(targetMap)) {
                    const deliveriesForNodePair = targetMap[targetDataId];

                    const deliveryGroups = this.groupDeliveries(deliveriesForNodePair, state.mergeDeliveriesType);
                    for (const deliveries of deliveryGroups) {
                        if (deliveries.length === 1) {
                            const delivery = deliveries[0];
                            const selected = !!selDel[delivery.id];
                            edgeData.push({
                                id: 'E' + iEdge++,
                                labelWoPrefix: delivery.highlightingInfo.label.join(' / ').replace(/\s+/, ' '),
                                ...this.getColorInfo(delivery.highlightingInfo.color, GraphService.DEFAULT_EDGE_COLOR),
                                source: sourceDataId,
                                target: targetDataId,
                                deliveries: [delivery],
                                selected: selected,
                                backward: delivery.backward,
                                forward: delivery.forward,
                                observed: delivery.observed,
                                crossContamination: delivery.crossContamination,
                                killContamination: delivery.killContamination,
                                score: delivery.score,
                                weight: delivery.weight,
                                wLabelSpace: false,
                                width: 1
                            });
                        } else {
                            const observedTypes = _.uniq(deliveries.filter(d => d.observed !== ObservedType.NONE).map(d => d.observed));

                            const observedType =
                                observedTypes.some(t => ObservedType.FULL) ?
                                ObservedType.FULL :
                                (
                                    observedTypes.some(t => ObservedType.BACKWARD) ?
                                    (
                                        observedTypes.some(t => ObservedType.FORWARD) ?
                                        ObservedType.FULL :
                                        ObservedType.BACKWARD
                                    ) :
                                    (
                                        observedTypes.some(t => ObservedType.FORWARD) ?
                                        ObservedType.FORWARD :
                                        ObservedType.NONE
                                    )
                                )
                            ;

                            const labels: string[] = _.uniq(
                                deliveries.map(d => (d.highlightingInfo.label.length > 0) ? d.highlightingInfo.label.join(' / ') : '')
                            );
                            edgeData.push({
                                id: 'E' + iEdge++,
                                labelWoPrefix: labels.length === 1 ? labels[0].replace(/\s+/, ' ') : '',
                                ...this.getColorInfo(
                                    this.mergeColors(deliveries.map(d => d.highlightingInfo.color)),
                                    GraphService.DEFAULT_EDGE_COLOR
                                ),
                                source: sourceDataId,
                                target: targetDataId,
                                deliveries: deliveries,
                                selected: deliveries.some(d => !!selDel[d.id]),
                                backward: deliveries.some(d => d.backward),
                                forward: deliveries.some(d => d.forward),
                                observed: observedType,
                                crossContamination: deliveries.some(d => d.crossContamination),
                                killContamination: deliveries.some(d => d.killContamination),
                                score: _.max(deliveries.map(d => d.score)),
                                weight: _.sum(deliveries.map(d => d.weight)),
                                wLabelSpace: false,
                                width: 1
                            });
                        }
                    }
                }

            }

        } else {
            let iEdge = 0;
            for (const delivery of data.deliveries.filter(d => !d.invisible)) {
                const sourceData = statMap[delivery.source];
                const targetData = statMap[delivery.target];

                if (sourceData && targetData) {
                    edgeData.push({
                        id: 'E' + iEdge++,
                        labelWoPrefix: delivery.highlightingInfo.label.join(' / ').replace(/\s+/, ' '),
                        ...this.getColorInfo(delivery.highlightingInfo.color, GraphService.DEFAULT_EDGE_COLOR),
                        source: sourceData.id,
                        target: targetData.id,
                        deliveries: [delivery],
                        selected: delivery.selected,
                        backward: delivery.backward,
                        forward: delivery.forward,
                        observed: delivery.observed,
                        crossContamination: delivery.crossContamination,
                        killContamination: delivery.killContamination,
                        score: delivery.score,
                        weight: delivery.weight,
                        wLabelSpace: false,
                        width: 1
                    });
                }
            }
        }

        const map: {[key: string]: CyEdgeData } = {};

        cyDataNodes.nodeData.forEach(node => node.degree = 0);
        for (const eData of edgeData) {
            eData.deliveries.forEach(d => {
                map[d.id] = eData;
            });
            if (eData.source !== eData.target) {
                cyDataNodes.idToNodeMap[eData.source].degree += eData.deliveries.length;
                cyDataNodes.idToNodeMap[eData.target].degree += eData.deliveries.length;
            }
        }
        GraphService.updateRelZindex(cyDataNodes.nodeData);
        this.updateEdgeLabels(state, edgeData);

        return {
            edgeData: edgeData,
            delIdToEdgeDataMap: map,
            edgeSel: Utils.createStringSet(edgeData.filter(n => n.selected).map(n => n.id))
        };
    }

    private updateLabelSpaceFlags(edges: CyEdgeData[]): void {
        const edgeGroups = this.getNodePairEdgeGroups(edges);
        for (const edgeGroup of edgeGroups) {
            const oneLabelExists = edgeGroup.some(edge => edge.label !== '');
            edgeGroup.forEach(edge => edge.wLabelSpace = oneLabelExists);
        }
    }

    private getNodePairEdgeGroups(edges: CyEdgeData[]): CyEdgeData[][] {
        const edgeGroups: { [key: string]: CyEdgeData[] } = {};

        for (const edge of edges) {
            const nodePairKey = edge.source < edge.target ? edge.source + edge.target : edge.target + edge.source;
            if (!edgeGroups[nodePairKey]) {
                edgeGroups[nodePairKey] = [edge];
            } else {
                edgeGroups[nodePairKey].push(edge);
            }
        }

        return Object.values(edgeGroups);
    }

    updateEdgeLabels(state: GraphState, edges: CyEdgeData[]): void {
        if (state.showMergedDeliveriesCounts) {
            edges.forEach(edge => {
                const nDel = edge.deliveries.length;
                if (nDel > 1) {
                    const nSel = edge.deliveries.filter(d => d.selected).length;
                    edge.label =
                        '[' + ((nSel > 0 && nSel < nDel) ? nSel + '/' : '') + nDel + ']' +
                        (edge.labelWoPrefix !== '' ? ' ' + edge.labelWoPrefix : '');
                } else {
                    edge.label = edge.labelWoPrefix;
                }
            });
        } else {
            edges.forEach(edge => edge.label = edge.labelWoPrefix);
        }
        this.updateLabelSpaceFlags(edges);
    }

    private groupDeliveries(deliveries: DeliveryData[], mergeDeliveriesType: MergeDeliveriesType): DeliveryData[][] {
        if (mergeDeliveriesType === MergeDeliveriesType.MERGE_PRODUCT_WISE) {
            return Utils.groupDeliveryByProduct(deliveries);
        } else if (mergeDeliveriesType === MergeDeliveriesType.MERGE_LOT_WISE) {
            return Utils.groupDeliveryByLot(deliveries);
        } else if (mergeDeliveriesType === MergeDeliveriesType.MERGE_LABEL_WISE) {
            return Utils.groupRows(deliveries, [(d: DeliveryData) => d.highlightingInfo.label.join('/')]);
        } else if (mergeDeliveriesType === MergeDeliveriesType.MERGE_ALL) {
            return [deliveries];
        } else if (mergeDeliveriesType === MergeDeliveriesType.NO_MERGE) {
            return deliveries.map(d => [d]);
        }
    }

    private mergeColors(colors: number[][][]): number[][] {
        return _.uniqWith([].concat(...colors),
            (c1: number[], c2: number[]) => c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2]
        );
    }

    private getColorInfo(colors: number[][], defaultColor: number[]): {
        stopColors: string,
        stopPositions: string
    } {
        if (colors.length === 0) {
            colors = [defaultColor];
        }
        const repeat = (s: string) => s + ' ' + s;
        const stopColors = colors.map(c => repeat(this.mapColor(c))).join(' ');
        const n = colors.length;
        const stopPositions = colors.map((c, i) => `${100 * i / n}% ${100 * (i + 1) / n}%`).join(' ');

        return {
            stopColors: stopColors,
            stopPositions: stopPositions
        };
    }

    private mapColor(color: number[]): string {
        return `rgb(${color[0]},${color[1]},${color[2]})`;
    }

    private applyStationProps(data: GraphServiceData) {
        for (const node of data.nodeData) {
            const station = node.station;
            const colorInfo = this.getColorInfo(station.highlightingInfo.color, GraphService.DEFAULT_NODE_COLOR);
            node.stopColors = colorInfo.stopColors;
            node.stopPositions = colorInfo.stopPositions;
            node.backward = station.backward;
            node.commonLink = station.commonLink;
            node.crossContamination = station.crossContamination;
            node.forward = station.forward;
            node.killContamination = station.killContamination;
            node.observed = station.observed;
            node.outbreak = station.outbreak;
            node.score = station.score;
        }
    }

    private applyDeliveryProps(data: GraphServiceData) {
        for (const edge of data.edgeData) {
            const aggregatedProps = this.aggregateDelProps(edge.deliveries);
            const colorInfo = this.getColorInfo(
                (
                    edge.deliveries.length > 0 ?
                    this.mergeColors(edge.deliveries.map(d => d.highlightingInfo.color)) :
                    edge.deliveries[0].highlightingInfo.color
                ),
                GraphService.DEFAULT_EDGE_COLOR
            );
            edge.stopColors = colorInfo.stopColors;
            edge.stopPositions = colorInfo.stopPositions;
            edge.backward = aggregatedProps.backward;
            edge.crossContamination = aggregatedProps.crossContamination;
            edge.forward = aggregatedProps.forward;
            edge.killContamination = aggregatedProps.killContamination;
            edge.observed = aggregatedProps.observed;
            edge.score = aggregatedProps.score;
        }
    }

    private aggregateDelProps(deliveries: DeliveryData[]): {
        backward: boolean,
        crossContamination: boolean,
        forward: boolean,
        killContamination: boolean,
        observed: ObservedType,
        score: number,
        weight: number
    } {
        if (deliveries.length === 1) {
            const delivery = deliveries[0];
            return {
                backward: delivery.backward,
                forward: delivery.forward,
                observed: delivery.observed,
                crossContamination: delivery.crossContamination,
                killContamination: delivery.killContamination,
                score: delivery.score,
                weight: delivery.weight
            };
        } else {
            const observedTypes = _.uniq(deliveries.filter(d => d.observed !== ObservedType.NONE).map(d => d.observed));

            const observedType =
                observedTypes.some(t => ObservedType.FULL) ?
                ObservedType.FULL :
                (
                    observedTypes.some(t => ObservedType.BACKWARD) ?
                    (
                        observedTypes.some(t => ObservedType.FORWARD) ?
                        ObservedType.FULL :
                        ObservedType.BACKWARD
                    ) :
                    (
                        observedTypes.some(t => ObservedType.FORWARD) ?
                        ObservedType.FORWARD :
                        ObservedType.NONE
                    )
                )
            ;

            return {
                backward: deliveries.some(d => d.backward),
                forward: deliveries.some(d => d.forward),
                observed: observedType,
                crossContamination: deliveries.some(d => d.crossContamination),
                killContamination: deliveries.some(d => d.killContamination),
                score: _.max(deliveries.map(d => d.score)),
                weight: _.sum(deliveries.map(d => d.weight))
            };
        }
    }

    private applyStatSelection(data: GraphServiceData) {
        data.nodeData.forEach(nodeData => {
            nodeData.selected = nodeData.station.selected;
        });
        data.nodeSel = Utils.createStringSet(data.nodeData.filter(n => n.selected).map(n => n.id));
    }

    private applyDelSelection(data: GraphServiceData) {
        data.edgeData.forEach(edgeData => {
            edgeData.selected = edgeData.deliveries.some(d => d.selected);
        });
        data.edgeSel = Utils.createStringSet(data.edgeData.filter(e => e.selected).map(e => e.id));
    }

    private applyState(state: GraphState) {
        const data = this.dataService.getData(state);
        let newData: GraphServiceData = {
            statIdToNodeDataMap: undefined,
            nodeData: undefined,
            delIdToEdgeDataMap: undefined,
            edgeData: undefined,
            nodeSel: undefined,
            edgeSel: undefined,
            propsChangedFlag: undefined,
            edgeLabelChangedFlag: undefined,
            ...(this.cachedData ? this.cachedData : {}),
            ...data
        };

        const nodeCreationRequired =
            !this.cachedState ||
            data.stations !== this.cachedData.stations ||
            this.cachedState.highlightingSettings.invisibleStations !== state.highlightingSettings.invisibleStations;

        const tracPropsChanged =
            !this.cachedState ||
            this.cachedState.tracingSettings !== state.tracingSettings;

        const edgeCreationRequired =
            nodeCreationRequired ||
            data.deliveries !== this.cachedData.deliveries ||
            this.cachedState.mergeDeliveriesType !== state.mergeDeliveriesType ||
            tracPropsChanged && state.mergeDeliveriesType === MergeDeliveriesType.MERGE_LABEL_WISE;

        const nodePropsUpdateRequired =
            !nodeCreationRequired &&
            tracPropsChanged;

        const nodeSelUpdateRequired =
            !nodeCreationRequired &&
            this.cachedState.selectedElements.stations !== state.selectedElements.stations;

        const edgePropsUpdateRequired =
            !edgeCreationRequired &&
            tracPropsChanged;

        const edgeSelUpdateRequired =
            !edgeCreationRequired &&
            this.cachedState.selectedElements.deliveries !== state.selectedElements.deliveries;

        const edgeLabelUpdateRequired =
            !edgeCreationRequired && (
                edgePropsUpdateRequired ||
                this.cachedState.showMergedDeliveriesCounts !== state.showMergedDeliveriesCounts ||
                edgeSelUpdateRequired && state.showMergedDeliveriesCounts
            );

        if (nodeCreationRequired) {
            const nodeData = this.createNodeData(state, data);
            newData = {
                ...newData,
                ...nodeData,
                ...this.createEdgeData(state, data, nodeData),
                propsChangedFlag: {},
                edgeLabelChangedFlag: {}
            };
        } else if (edgeCreationRequired) {
            newData = {
                ...newData,
                ...this.createEdgeData(state, data, newData),
                propsChangedFlag: {},
                edgeLabelChangedFlag: {}
            };
        }

        if (nodePropsUpdateRequired) {
            newData.propsChangedFlag = {};
            this.applyStationProps(newData);
            GraphService.updateRelZindex(newData.nodeData);
        }

        if (edgePropsUpdateRequired) {
            newData.propsChangedFlag = {};
            this.applyDeliveryProps(newData);
        }

        if (nodeSelUpdateRequired) {
            this.applyStatSelection(newData);
            GraphService.updateAbsZindex(newData.nodeData);
        }

        if (edgeSelUpdateRequired) {
            this.applyDelSelection(newData);
        }

        if (edgeLabelUpdateRequired) {
            newData.edgeLabelChangedFlag = {};
            this.updateEdgeLabels(state, newData.edgeData);
        }

        this.cachedState = { ...state };
        this.cachedData = newData;
    }
}
