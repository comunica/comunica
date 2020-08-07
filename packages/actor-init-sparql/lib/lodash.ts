function mapValues(object: any, func: (key: any, value: any, index: number) => any): void {
  if (object) {
    Object.entries(object).forEach(([ key, value ], index) => {
      object[key] = func(key, value, index);
    });
  }
}

function uniq(array: any[]): any[] {
  return array.filter((value, index) => array.indexOf(value) === index);
}

function union(arrays: any[][]): any[] {
  return uniq(arrays.flat());
}

function intersection(arrays: any[][]): any[] {
  let baseArray = arrays[0];
  for (const array of arrays.slice(1)) {
    baseArray = baseArray.filter(el => array.includes(el));
  }
  return baseArray;
}

function assign(object: any, sources: any[]): any {
  for (const source of sources) {
    Object.assign(object, source);
  }
  return object;
}

function defaults(object: any, sources: any[]): any {
  sources = sources.reverse();
  sources.push(object);
  object = assign({}, sources);
  return object;
}

export { mapValues, uniq, union, intersection, assign, defaults };
