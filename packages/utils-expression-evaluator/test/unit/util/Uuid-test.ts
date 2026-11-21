const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

describe('Uuid', () => {
  let uuidv4: () => string;
  let uuidv4FromRandomValues: () => string;

  beforeEach(() => {
    // Reload the module, so that each test starts with an empty pool of random bytes.
    jest.isolateModules(() => {
      ({ uuidv4, uuidv4FromRandomValues } = require('../../../lib/util/Uuid'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('uuidv4', () => {
    it('creates random version 4 UUIDs', () => {
      const uuids = Array.from({ length: 100 }, () => uuidv4());
      for (const uuid of uuids) {
        expect(uuid).toMatch(UUID_V4);
      }
      expect(new Set(uuids).size).toBe(100);
    });

    it('uses crypto.randomUUID if available', () => {
      const spy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
      expect(uuidv4()).toBe('00000000-0000-4000-8000-000000000001');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    describe('without crypto.randomUUID', () => {
      beforeEach(() => {
        Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
      });

      afterEach(() => {
        // Expose the method of the prototype again.
        delete (<any> crypto).randomUUID;
      });

      it('falls back to random values', () => {
        const spy = jest.spyOn(crypto, 'getRandomValues');
        expect(uuidv4()).toMatch(UUID_V4);
        expect(spy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('uuidv4FromRandomValues', () => {
    it('creates random version 4 UUIDs', () => {
      const uuids = Array.from({ length: 100 }, () => uuidv4FromRandomValues());
      for (const uuid of uuids) {
        expect(uuid).toMatch(UUID_V4);
      }
      expect(new Set(uuids).size).toBe(100);
    });

    it('sets the version and variant bits', () => {
      jest.spyOn(crypto, 'getRandomValues').mockImplementation((array: any) => array.fill(0xFF));
      expect(uuidv4FromRandomValues()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    });

    it('pads bytes with leading zeros', () => {
      jest.spyOn(crypto, 'getRandomValues').mockImplementation((array: any) => array.fill(0));
      expect(uuidv4FromRandomValues()).toBe('00000000-0000-4000-8000-000000000000');
    });

    it('requests random values once per 16 UUIDs', () => {
      const spy = jest.spyOn(crypto, 'getRandomValues');
      for (let i = 0; i < 16; i++) {
        uuidv4FromRandomValues();
      }
      expect(spy).toHaveBeenCalledTimes(1);
      uuidv4FromRandomValues();
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });
});
