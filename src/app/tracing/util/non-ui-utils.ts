import {
    DeliveryData, StationData, TableMode, DataServiceData, Color, Position
} from '../data.model';
import { HttpClient } from '@angular/common/http';
import { Constants } from './constants';
import { Map as ImmutableMap } from 'immutable';
import * as _ from 'lodash';

type USwitch<A, B> = (A | unknown extends A ? B : A) & A;

export class Utils {

    static getTableElements(mode: TableMode, data: DataServiceData): (StationData | DeliveryData)[] {
        if (mode === TableMode.STATIONS) {
            return data.stations;
        } else if (mode === TableMode.DELIVERIES) {
            return data.deliveries;
        }

        return null;
    }

    static getTableProperties(mode: TableMode, stationColumns: string[], deliveryColumns: string[]): string[] {
        if (mode === TableMode.STATIONS) {
            return stationColumns;
        } else if (mode === TableMode.DELIVERIES) {
            return deliveryColumns;
        }

        return null;
    }

    static getAllTableProperties(mode: TableMode, data: DataServiceData): string[] {
        let properties: string[];

        if (mode === TableMode.STATIONS) {
            properties = Constants.STATION_PROPERTIES.toArray();
        } else if (mode === TableMode.DELIVERIES) {
            properties = Constants.DELIVERY_PROPERTIES.toArray();
        }

        const additionalProps: Set<string> = new Set();

        for (const element of Utils.getTableElements(mode, data)) {
            for (const p of element.properties) {
                additionalProps.add(p.name);
            }
        }

        return properties.filter(prop => Constants.PROPERTIES.has(prop)).concat(Array.from(additionalProps));
    }

    static colorToCss(color: Color): string {
        return 'rgb(' + color.r + ', ' + color.g + ', ' + color.b + ')';
    }

    static mixColors(color1: Color, color2: Color): Color {
        return {
            r: Math.round((color1.r + color2.r) / 2),
            g: Math.round((color1.g + color2.g) / 2),
            b: Math.round((color1.b + color2.b) / 2)
        };
    }

    static getAllCombinations(values: any[]): any[][] {
        const n = Math.pow(2, values.length);
        const combinations = [];

        for (let i = 1; i < n; i++) {
            const bits = i.toString(2).split('').reverse().join('');
            const combination = [];

            for (let j = 0; j < values.length; j++) {
                if (bits[j] === '1') {
                    combination.push(values[j]);
                }
            }

            combinations.push(combination);
        }

        combinations.sort((c1, c2) => c1.length - c2.length);

        return combinations;
    }

    static getCenter(positions: Position[]): Position {
        let xSum = 0;
        let ySum = 0;

        for (const pos of positions) {
            xSum += pos.x;
            ySum += pos.y;
        }

        return {
            x: xSum / positions.length,
            y: ySum / positions.length
        };
    }

    static sum(position1: Position, position2: Position): Position {
        return {
            x: position1.x + position2.x,
            y: position1.y + position2.y
        };
    }

    static difference(position1: Position, position2: Position): Position {
        return {
            x: position1.x - position2.x,
            y: position1.y - position2.y
        };
    }

    static stringToDate(dateString: string): Date {
        if (dateString != null) {
            const date = new Date(dateString);

            if (isNaN(date.getTime())) {
                throw new SyntaxError('Invalid date: ' + dateString);
            } else {
                return date;
            }
        } else {
            return null;
        }
    }

    static dateToString(date: Date): string {
        if (date != null) {
            const isoString = date.toISOString();

            return isoString.substring(0, isoString.indexOf('T'));
        } else {
            return null;
        }
    }

    static arrayToMap<VT, KT>(array: VT[], keyFun: (value: VT) => KT): Map<KT, VT> {
        const result: Map<KT, VT> = new Map();
        for (const value of array) {
            result.set(keyFun(value), value);
        }
        return result;
    }

    static createReverseMap<X, Y>(map: Map<X, Y> | ImmutableMap<X, Y>): Map<Y, X> {
        return (
            map['asImmutable'] ?
            Utils.getReverseMapOfImmutableMap(map as ImmutableMap<X, Y>) :
            Utils.getReverseMapOfMap(map as Map<X, Y>)
        );
    }

    private static getReverseMapOfMap<X, Y>(map: Map<X, Y>): Map<Y, X> {
        return new Map(
            Array.from(map.entries()).map(([fromProp, toProp]) => [toProp, fromProp])
        );
    }

    private static getReverseMapOfImmutableMap<X, Y>(map: ImmutableMap<X, Y>): Map<Y, X> {
        const result: Map<Y, X> = new Map();
        map.forEach((value: Y, key: X) => result.set(value, key));
        return result;
    }

    static async getJson(filePath: string, httpClient: HttpClient): Promise<any> {
        return httpClient.get(filePath).toPromise()
            .then(response => response)
            .catch(error => Promise.reject(error));
    }

    static getProperty(data: any, path: string): any {
        if (data != null) {
            for (const propName of path.split('.')) {
                if (data.hasOwnProperty(propName)) {
                    data = data[propName];
                } else {
                    return null;
                }
                if (data === null) {
                    return null;
                }
            }
        }
        return data;
    }

    static setProperty(rawData: any, propPath: string, value: any) {
        let container: any = rawData;
        const propNames: string[] = propPath.split('.');
        // tslint:disable-next-line:one-variable-per-declaration
        for (let i = 0, iMax = propNames.length - 1; i < iMax; i++) {
            if (!container.hasOwnProperty(propNames[i])) {
                container[propNames[i]] = {};
            }
            container = container[propNames[i]];
        }
        container[propNames[propNames.length - 1]] = value;
    }

    static getMatrix<T>(rowCount: number, columnCount: number, value: T): T[][] {
        const result: T[][] = [];
        for (let r = rowCount - 1; r >= 0; r--) {
            result[r] = new Array<T>(columnCount).fill(value);
        }
        return result;
    }

    static replaceAll(text: string, find: string, replace: string) {
        return text.replace(new RegExp(find, 'g'), replace);
    }

    static getTranspose<T>(matrix: T[][]): T[][] {
        return matrix[0].map((col, i) => matrix.map(row => row[i]));
    }

    /**
     * Partitions elements into groups according to the element key mapping.
     *
     * @param elements array of elements which shall be grouped
     * @param keyFn element to element key mapping
     */
    static getGroups<T>(elements: T[], keyFn: (t: T) => string): Map<string, T[]> {
        const result: Map<string, T[]> = new Map();
        elements.forEach(e => {
            const key: string = keyFn(e);
            if (result.has(key)) {
                result.get(key).push(e);
            } else {
                result.set(key, [e]);
            }
        });
        return result;
    }

    static createObjectFromMap<T>(map: Map<string, T>): { [key: string]: T } {
        return _.fromPairs(Array.from(map.entries()));
    }

    static createObjectFromArray<
        V,
        X extends USwitch<W, V>,
        W
    >(
        arr: V[],
        keyMap: (v: V) => string,
        valueMap?: (v: V) => W
    ): { [key: string]: X } {
        const result: { [key: string]: X } = {};
        if (valueMap) {
            for (const value of arr) {
                result[keyMap(value)] = valueMap(value) as X;
            }
        } else {
            for (const value of arr) {
                result[keyMap(value)] = value as X;
            }
        }
        return result;
    }

    static transformMap<K, V, TK, TV>(
        map: Map<K, V>,
        keyMapper: (k: K, v: V) => TK,
        valueMapper: (k: K, v: V) => TV
    ): Map<TK, TV> {
        return new Map(Array.from(map.entries()).map(([k, v]) => [keyMapper(k, v), valueMapper(k, v)]));
    }

    static createSimpleStringSet(arr: string[]): {[key: string]: boolean} {
        const result: {[key: string]: boolean} = {};
        for (const value of arr) {
            result[value] = true;
        }
        return result;
    }

    static compareStrings(a: string, b: string): number {
        if (a === null) {
            if (b === null) {
                return 0;
            } else {
                return -b.localeCompare(a);
            }
        } else {
            return a.localeCompare(b);
        }
    }

    static compareNumbers(a: number, b: number): number {
        return (a === b ? 0 : (a < b ? -1 : 1));
    }

    static groupRows<T>(rows: T[], keyFuns: ((t: T) => string | boolean | number)[]): T[][] {
        const keyToIndicesMap: { [key: string]: number[] } = {};
        const nRows = rows.length;
        const nKeys = keyFuns.length;
        for (let iRow = 0; iRow < nRows; iRow++) {
            const keys: (string | boolean | number)[] = [];
            for (const keyFun of keyFuns) {
                keys.push(keyFun(rows[iRow]));
            }
            const key = JSON.stringify(keys);
            const indices = keyToIndicesMap[key];
            if (!indices) {
                keyToIndicesMap[key] = [iRow];
            } else {
                indices.push(iRow);
            }
        }
        const sortedKeys = Object.keys(keyToIndicesMap);
        const result: T[][] = [];
        for (const key of sortedKeys.sort()) {
            result.push(keyToIndicesMap[key].map(i => rows[i]));
        }
        return result;
    }

    static groupDeliveryByProduct(deliveries: DeliveryData[]): DeliveryData[][] {
        return this.groupRows(deliveries, [
            (d) => d.originalSource,
            (d) => d.originalTarget,
            (d) => d.name || d.id
        ]);
    }

    static groupDeliveryByLot(deliveries: DeliveryData[]): DeliveryData[][] {
        const deliveryPGroups = Utils.groupDeliveryByProduct(deliveries);
        const result: DeliveryData[][] = [];
        for (const deliveryPGroup of deliveryPGroups) {
            if (deliveryPGroup.length === 1) {
                result.push(deliveryPGroup);
            } else {
                result.push(...this.groupRows(deliveryPGroup, [ (d) => d.lot || d.id ]));
            }
        }
        return result;
    }
}