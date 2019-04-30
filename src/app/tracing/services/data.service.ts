import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FclData, GraphSettings, TableSettings } from '../util/datatypes';
import { Constants } from '../util/constants';
import { DataImporter } from '../util/data-importer/data-importer';
import { DataExporter } from '../util/data-exporter';

@Injectable({
    providedIn: 'root'
})
export class DataService {
    private dataSource: string | File;
    private data: FclData;
    private rawData: any;

    static getDefaultGraphSettings(): GraphSettings {
        return {
            type: Constants.DEFAULT_GRAPH_TYPE,
            nodeSize: Constants.DEFAULT_GRAPH_NODE_SIZE,
            fontSize: Constants.DEFAULT_GRAPH_FONT_SIZE,
            mergeDeliveries: Constants.DEFAULT_GRAPH_MERGE_DELIVERIES,
            skipUnconnectedStations: Constants.DEFAULT_SKIP_UNCONNECTED_STATIONS,
            showLegend: Constants.DEFAULT_GRAPH_SHOW_LEGEND,
            showZoom: Constants.DEFAULT_GRAPH_SHOW_ZOOM
        };
    }

    static getDefaultTableSettings(): TableSettings {
        return {
            mode: Constants.DEFAULT_TABLE_MODE,
            width: Constants.DEFAULT_TABLE_WIDTH,
            stationColumns: Constants.DEFAULT_TABLE_STATION_COLUMNS.toArray(),
            deliveryColumns: Constants.DEFAULT_TABLE_DELIVERY_COLUMNS.toArray(),
            showType: Constants.DEFAULT_TABLE_SHOW_TYPE
        };
    }

    private static createDefaultFclData(): FclData {
        return {
            elements: {
                stations: null,
                deliveries: null,
                samples: null
            },
            layout: null,
            gisLayout: null,
            graphSettings: this.getDefaultGraphSettings(),
            tableSettings: this.getDefaultTableSettings()
        };
    }

    private async preprocessData(data: any): Promise<FclData> {
        const fclData: FclData = DataService.createDefaultFclData();
        await DataImporter.preprocessData(data, fclData, this.httpClient);
        return fclData;
    }

    constructor(private httpClient: HttpClient) {}

    setDataSource(source: string | File) {
        delete this.data;
        delete this.rawData;
        this.dataSource = source;
    }

    getData(): Promise<FclData> {

        console.log('DataService, getData!!!');

        if (this.data != null) {
            return new Promise((resolve, reject) => resolve(this.data));
        } else if (typeof this.dataSource === 'string') {
            let rawData: any;
            return this.httpClient.get(this.dataSource)
              .toPromise()
              .then(response => {
                  rawData = response;
                  return this.preprocessData(response);
              })
              .then(data => {
                  this.rawData = rawData;
                  this.data = data;
                  return this.data;
              });
        } else if (this.dataSource instanceof File) {
            const file: File = this.dataSource;
            return new Promise((resolve, reject) => {
                const fileReader = new FileReader();

                fileReader.onload = (event: Event) => {
                    const contents: any = event.target;

                    try {
                        const rawData = JSON.parse(contents.result);
                        this.preprocessData(rawData)
                        .then(data => {
                          this.rawData = rawData;
                          this.data = data;
                          resolve(this.data);
                        })
                        .catch(e => {
                            reject(e);
                        });
                    } catch (e) {
                        reject(e);
                    }
                };

                fileReader.readAsText(file);
            });
        } else {
            throw new Error('no data source specified');
        }
    }

    getExportData(): any {
        const exportData: any = this.rawData !== null ? this.rawData : {};
        DataExporter.exportData(this.data, exportData);
        return exportData;
    }
}
