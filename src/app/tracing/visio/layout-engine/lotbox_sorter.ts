import * as _ from 'lodash';
import { VisioBox, VisioConnector, VisioPort, Position } from './datatypes';
import { Utils } from '../../util/utils';

interface WeightedBox {
    weight: number;
    box: VisioBox;
}

export class LotBoxSorter {
    private portToConnectedPositionsMap: Map<string, Position[]>;
    private portToPositionMap: Map<string, Position>;

    constructor(portToBoxMap: Map<VisioPort, VisioBox>, connectors: VisioConnector[]) {
        const portToConnectedPortsMap = this.createPortToConnectedPortsMap(connectors);
        this.portToPositionMap = this.createPortToPositionMap(portToBoxMap);
        this.portToConnectedPositionsMap = this.createPortToConnectedPositionsMap(portToConnectedPortsMap);
    }

    private getMinPosition(lotBoxes: VisioBox[]): Position {
        return {
            x: Math.min(...lotBoxes.map(b => b.position.x)),
            y: Math.min(...lotBoxes.map(b => b.position.y))
        };
    }

    sortLotBoxes(lotBoxes: VisioBox[]) {
        const boxes = this.getInitialSorting(lotBoxes);
        // this.improveSorting(boxes);
        this.applySorting(boxes, lotBoxes);
    }

    private applySorting(orderedBoxes: VisioBox[], boxesToSort: VisioBox[]) {
        for (let i = 0; i < orderedBoxes.length; i++) {
            boxesToSort[i] = orderedBoxes[i];
        }
    }

    private createPortToConnectedPositionsMap(portToConnectedPortsMap: Map<string, string[]>): Map<string, Position[]> {
        const portToConnectedPositionsMap: Map<string, Position[]> = new Map();
        portToConnectedPortsMap.forEach((toPorts, fromPort) => {
            const fromPortPosition = this.portToPositionMap.get(fromPort);
            portToConnectedPositionsMap.set(fromPort, toPorts.map(p => this.portToPositionMap.get(p)));
        });
        return portToConnectedPositionsMap;
    }

    private getInitialSorting(boxes: VisioBox[]): VisioBox[] {
        const weightedBoxes = boxes.map(
            b => ({
                weight: this.getWeight(b, this.portToPositionMap.get(b.ports[0].id)),
                box: b
            })
        );
        weightedBoxes.sort((wB1, wB2) => wB1.weight - wB2.weight);
        return weightedBoxes.map(wb => wb.box);
    }

    private getWeight(box: VisioBox, fromPortPosition: Position): number {
        const positions = this.portToConnectedPositionsMap.get(box.ports[0].id);
        const x = positions.map(p => this.getNormalizedDeltaX(Utils.difference(p, fromPortPosition)));
        return _.mean(x);
    }

    private getNormalizedDeltaX(position: Position): number {
        const distance = Math.sqrt(position.x * position.x + position.y * position.y);
        if (distance === 0) {
            return 0;
        } else {
            return position.x / distance;
        }
    }

    private createPortToConnectedPortsMap(connectors: VisioConnector[]): Map<string, string[]> {
        const result: Map<string, string[]> = new Map();
        connectors.forEach(connector => {
            if (!result.has(connector.fromPort)) {
                result.set(connector.fromPort, []);
            }
            if (!result.has(connector.toPort)) {
                result.set(connector.toPort, []);
            }
            result.get(connector.fromPort).push(connector.toPort);
            result.get(connector.toPort).push(connector.fromPort);
        });
        return result;
    }

    private createPortToPositionMap(portToBoxMap: Map<VisioPort, VisioBox>): Map<string, Position> {
        const result: Map<string, Position> = new Map();

        portToBoxMap.forEach((box, port) => {
            result.set(port.id, {
                x: box.position.x + port.normalizedPosition.x * box.size.width,
                y: box.position.y + port.normalizedPosition.y * box.size.height
            });
        });

        return result;
    }
}