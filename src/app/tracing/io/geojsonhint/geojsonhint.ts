const geojsonHintObject = require('@mapbox/geojsonhint/lib/object');

interface Issue {
    line: number;
    level?: string;
    message: string;
}

export function geojsonhint(jsonObject: any): Issue[] {
    const errors = geojsonHintObject.hint(jsonObject, { precisionWarning: false, noDuplicateMembers: false });
    return errors;
}
