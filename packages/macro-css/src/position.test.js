import { absolute, fixed, relative } from "./position";

const INVERSE = [
  ["top", "bottom"],
  ["left", "right"],
  ["right", "left"],
  ["bottom", "top"],
]

for(const mod of [absolute, fixed]){
  const position = mod.name;

  describe(position, () => {
    it("will use single spacing", () => {
      const result = mod(0);

      expect(result).toEqual({
        position,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      })
    })

    it("will use dual spacing", () => {
      const result = mod(0, 1);

      expect(result).toEqual({
        position,
        top: 0,
        right: 1,
        bottom: 0,
        left: 1
      })
    })

    it("will use triple spacing", () => {
      const result = mod(0, 1, 2);

      expect(result).toEqual({
        position,
        top: 0,
        right: 1,
        bottom: 2,
        left: 1
      })
    })

    it("will use explicit spacing", () => {
      const result = mod(0, 1, 2, 3);

      expect(result).toEqual({
        position,
        top: 0,
        right: 1,
        bottom: 2,
        left: 3
      })
    })

    it("will fill element", () => {
      const result = mod("fill");

      expect(result).toEqual({
        position,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      })
    })

    it("will fill element with offset", () => {
      const result = mod("fill", 10);

      expect(result).toEqual({
        position,
        top: 10,
        left: 10,
        right: 10,
        bottom: 10
      })
    })

    it("will fill element with dual offset", () => {
      const result = mod("fill", 10, 20);

      expect(result).toEqual({
        position,
        top: 10,
        left: 20,
        right: 20,
        bottom: 10
      })
    })

    for(const [dir, inverse] of INVERSE)
      it(`will fill ${dir}`, () => {
        const result = mod(`fill-${dir}`);
        const offset = {
          position,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }

        delete offset[inverse];
  
        expect(result).toEqual(offset)
      })
  
    for(const [dir, inverse] of INVERSE)
      it(`will offset ${dir}`, () => {
        const result = mod(`fill-${dir}`, 10);
        const offset = {
          position,
          top: 10,
          left: 10,
          right: 10,
          bottom: 10
        }

        delete offset[inverse];

        expect(result).toEqual(offset)
      })
  })
}