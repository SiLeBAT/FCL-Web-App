import { HttpClient } from '@angular/common/http';

export async function getDataFromPath(filePath: string, httpClient: HttpClient): Promise<any> {
    return httpClient.get(filePath).toPromise()
        .then(response => response)
        .catch(error => Promise.reject(error));
}

export async function getJsonFromFile(file: File): Promise<any> {
    const text = await getTextFromFile(file);
    const jsonData = JSON.parse(text);
    return jsonData;
}

export async function getTextFromFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();

        fileReader.onload = (event: Event) => {
            const contents: any = event.target;

            resolve(contents.result);
        };

        fileReader.onerror = (event: Event) => {
            reject('DFdfdfd');
        };

        fileReader.readAsText(file);
    });
}
