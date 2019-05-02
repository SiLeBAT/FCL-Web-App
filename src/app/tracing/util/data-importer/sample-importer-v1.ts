import { SampleData, FclData, StationData, SampleResultType, DeliveryData } from './../datatypes';
import { Utils } from './../utils';
import { Constants } from './../data-mappings/data-mappings-v1';

export function importSamples(rawData: any, fclData: FclData) {
    fclData.elements.samples = convertRawSamples(rawData);
    if (fclData.elements.samples == null) {
        fclData.elements.samples = generateMockSampleData(fclData.elements.stations, fclData.elements.deliveries);
    }
}

function convertRawSamples(rawData: any): SampleData[] {
    if (rawData != null && rawData[Constants.SAMPLEDATA] !== undefined) {
        const result: SampleData[] = [];
        for (const rawSample of rawData[Constants.SAMPLEDATA]) {
            result.push({
                station: rawSample.sampleStation || null,
                lot: rawSample.sampledLot || null,
                result: rawSample.result || null,
                resultType: convertRawSampleResultType(rawSample.resultType),
                time: rawSample.time || null,
                amount: rawSample.amount || null,
                type: rawSample.type || null,
                material: rawSample.material || null
            });
        }
        return result;
    }
    return [];
}

function convertRawSampleResultType(type: string): SampleResultType {
    if (type == null) {
        return SampleResultType.Unkown;
    } else if (type === 'C') {
        return SampleResultType.Confirmed;
    } else if (type === 'N') {
        return SampleResultType.Negative;
    } else if (type === 'P') {
        return SampleResultType.Probable;
    } else {
        return SampleResultType.Unkown;
    }
}

function generateMockSampleData(stations: StationData[], deliveries: DeliveryData[]): SampleData[] {
    return [].concat(
        generateMockStationSamples(stations),
        generateMockLotOutSamples(deliveries),
        generateMockIncomingSamples(stations, deliveries)
    );
}

function generateMockStationSamples(stations: StationData[]): SampleData[] {
    const result: SampleData[] = [];
    for (const station of stations) {
        if (Math.random() <= 0.3) {
            const nSamples: number = Math.floor(Math.sqrt(Math.random() * 10)) + 1;
            for (let k = 1; k <= nSamples; k++) {
                result.push({
                    station: station.id,
                    lot: null,
                    type: 'fake station sample',
                    material: 'fake material',
                    time: 'fake time',
                    amount: 'fake amount',
                    result: 'fake result: ' + getRandomText(),
                    resultType: generateMockResultType()
                });
            }
        }
    }
    return result;
}

function generateMockLotOutSamples(deliveries: DeliveryData[]): SampleData[] {
    const result: SampleData[] = [];
    const lotIdToDeliveryRef: Map<string, DeliveryData> = new Map();
    // Mock lot samples will be generated from deliveries, so
    // get a reference delivery for each lot
    deliveries.forEach(d => {
        const uniqueLotIdentifier = 'S' + d.originalSource + '|' + (d.name || d.id) + '|' + (d.lot || d.id);
        lotIdToDeliveryRef.set(uniqueLotIdentifier, d);
    });
    lotIdToDeliveryRef.forEach(delivery => {
        if (Math.random() <= 0.6) {
            const nSamples: number = Math.floor(Math.sqrt(Math.random() * 10)) + 1;
            for (let k = 1; k <= nSamples; k++) {
                result.push({
                    station: delivery.originalSource,
                    lot: delivery.lotKey || generateMockLotKey(delivery),
                    type: 'fake lot out sample',
                    material: null,
                    time: 'fake time',
                    amount: 'fake amount',
                    result: 'fake result: ' + getRandomText(),
                    resultType: generateMockResultType()
                });
            }
        }
    });
    return result;
}

function generateMockLotKey(delivery: DeliveryData): string {
    return delivery.originalSource + '|' + delivery.name || delivery.id + '|' + delivery.lot || delivery.id;
}

function generateMockIncomingSamples(stations: StationData[], deliveries: DeliveryData[]): SampleData[] {
    const result: SampleData[] = [];
    const idToDeliveryMap: Map<string, DeliveryData> = Utils.arrayToMap(deliveries, (d) => d.id);
    for (const station of stations) {
        if (Math.random() <= 0.5) {
            const delIdsWithOutgoingRelation: Set<string> = new Set(station.connections.map(con => con.source));
            for (const delivery of station.incoming.map(id => idToDeliveryMap.get(id))) {
                if (delivery !== null) {
                    result.push({
                        station: station.id,
                        lot: delivery.lotKey || generateMockLotKey(delivery),
                        type: 'fake incoming sample',
                        material: null,
                        time: 'fake time',
                        amount: 'fake amount',
                        result: 'fake result: ' + getRandomText(),
                        resultType: delIdsWithOutgoingRelation.has(delivery.id) ? SampleResultType.Negative : generateMockResultType()
                    });
                }
            }
        }
    }
    return result;
}

function generateMockResultType(): SampleResultType {
    const i = Math.random();
    if (i <= 0.7) {
        return SampleResultType.Negative;
    } else if (i <= 0.9) {
        return SampleResultType.Probable;
    } else {
        return SampleResultType.Confirmed;
    }
}

function getRandomText(): string {
    let text = '';
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const maxLength = 10;
    const minLength = 4;
    const nT = minLength + Math.round((maxLength - minLength) * Math.random());
    for (let i = nT; i > 0; i--) {
        text += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return text;
}
