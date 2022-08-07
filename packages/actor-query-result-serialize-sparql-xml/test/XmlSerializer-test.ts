import { XmlSerializer } from '../lib/XmlSerializer';

describe('XmlSerializer', () => {
  let data: string[];
  let serializer: XmlSerializer;

  beforeEach(() => {
    data = [];
    serializer = new XmlSerializer(chunk => data.push(chunk));
  });

  it('should support opening and closing tags', () => {
    serializer.open('foo', { bar: 'baz' });
    serializer.close();
    return expect(data.join('')).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<foo bar="baz">
</foo>
`);
  });

  it('should support tree', () => {
    serializer.add({
      name: 'foo',
      attributes: { bar: 'baz' },
      children: [
        { name: 'bar', attributes: { bar: 'baz' }, children: 'test' },
        { name: 'baz', attributes: { bar: 'baz' }},
      ],
    });
    return expect(data.join('')).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<foo bar="baz">
  <bar bar="baz">test</bar>
  <baz bar="baz"/>
</foo>
`);
  });

  it('should escape text', () => {
    serializer.add({ name: 'bar', children: '\'&<>"' });
    return expect(data.join('')).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<bar>&apos;&amp;&lt;&gt;&quot;</bar>
`);
  });

  it('should escape attributes', () => {
    serializer.add({ name: 'bar', attributes: { baz: '\'&<>"' }});
    return expect(data.join('')).toEqual(`<?xml version="1.0" encoding="UTF-8"?>
<bar baz="&apos;&amp;&lt;&gt;&quot;"/>
`);
  });

  it('should check extra close calls', () => {
    serializer.open('foo');
    serializer.close();
    return expect(() => serializer.close()).toThrow(Error);
  });
});
