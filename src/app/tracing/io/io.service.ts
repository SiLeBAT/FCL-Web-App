import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FclData } from '../data.model';
import { createInitialFclDataState } from '../state/tracing.reducers';
import { DataImporter } from './data-importer/data-importer';
import { DataExporter } from './data-exporter';
import { DataImporterV1 } from './data-importer/data-importer-v1';
import { createEmptyJson } from './json-data-creator';

@Injectable({
    providedIn: 'root'
})
export class IOService {

    private rawData: any;

    private async preprocessData(data: any): Promise<FclData> {
        const fclData: FclData = createInitialFclDataState();
        await DataImporter.preprocessData(data, fclData, this.httpClient);
        return fclData;
    }

    constructor(private httpClient: HttpClient) {}

    getData(dataSource: string | File): Promise<FclData> {
        if (typeof dataSource === 'string') {
            let rawData: any;
            return this.httpClient.get(dataSource)
              .toPromise()
              .then(response => {
                  rawData = response;
                  return this.preprocessData(response);
              })
              .then(data => {
                  this.rawData = rawData;
                  return data;
              });
        } else if (dataSource instanceof File) {
            const file: File = dataSource;
            return new Promise((resolve, reject) => {
                const fileReader = new FileReader();

                fileReader.onload = (event: Event) => {
                    const contents: any = event.target;

                    try {
                        const rawData = JSON.parse(contents.result);
                        this.preprocessData(rawData)
                        .then(data => {
                          this.rawData = rawData;
                          resolve(data);
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

    getExportData(data: FclData): Promise<any> {
        if (this.rawData) {
            const dataImporter = new DataImporterV1(this.httpClient);
            return dataImporter.isDataFormatSupported(this.rawData).then(
                isSupported => {
                    const exportData: any = isSupported ? this.rawData : createEmptyJson();
                    DataExporter.exportData(data, exportData);
                    return exportData;
                }
            );
        } else {
            return new Promise(resolve => {
                const exportData = createEmptyJson() ;
                DataExporter.exportData(data, exportData);
                resolve(exportData);
            });
        }
    }
}
