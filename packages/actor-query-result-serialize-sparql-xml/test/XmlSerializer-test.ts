import { XmlSerializer } from '../lib/XmlSerializer';

describe('XmlSerializer', () => {
  let data: string[];
  let serializer: XmlSerializer;

  beforeEach(() => {
    data = [];
    serializer = new XmlSerializer();
  });

  it('should support opening and closing tags', () => {
    data.push(XmlSerializer.header);
    data.push(serializer.open('foo', { bar: 'baz' }));
    data.push(serializer.close());
    expect(data.join('')).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<foo bar="baz">
</foo>
`);
  });

  it('should support tree', () => {
    data.push(XmlSerializer.header);
    data.push(serializer.serializeNode({
      name: 'foo',
      attributes: { bar: 'baz' },
      children: [
        { name: 'bar', attributes: { bar: 'baz' }, children: 'test' },
        { name: 'baz', attributes: { bar: 'baz' }},
      ],
    }));
    expect(data.join('')).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<foo bar="baz">
  <bar bar="baz">test</bar>
  <baz bar="baz"/>
</foo>
`);
  });

  it('should escape text', () => {
    data.push(XmlSerializer.header);
    data.push(serializer.serializeNode({ name: 'bar', children: '\'&<>"' }));
    expect(data.join('')).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<bar>&apos;&amp;&lt;&gt;&quot;</bar>
`);
  });

  it('should escape attributes', () => {
    data.push(XmlSerializer.header);
    data.push(serializer.serializeNode({ name: 'bar', attributes: { baz: '\'&<>"' }}));
    expect(data.join('')).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<bar baz="&apos;&amp;&lt;&gt;&quot;"/>
`);
  });

  it('should check extra close calls', () => {
    data.push(XmlSerializer.header);
    data.push(serializer.open('foo'));
    data.push(serializer.close());
    expect(() => serializer.close()).toThrow(Error);
  });
});
