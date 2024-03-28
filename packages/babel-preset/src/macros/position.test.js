import { absolute, fixed } from "./position";

const INVERSE = [
  ["top", "bottom"],
  ["left", "right"],
  ["right", "left"],
  ["bottom", "top"],
]

for(const macro of [absolute, fixed]){
  const position = macro.name;

  describe(position, () => {
    it("will use single spacing", () => {
      const result = macro(0);

      expect(result).toEqual({
        position,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      })
    })

    it("will use dual spacing", () => {
      const result = macro(0, 1);

      expect(result).toEqual({
        position,
        top: 0,
        right: 1,
        bottom: 0,
        left: 1
      })
    })

    it("will use triple spacing", () => {
      const result = macro(0, 1, 2);

      expect(result).toEqual({
        position,
        top: 0,
        right: 1,
        bottom: 2,
        left: 1
      })
    })

    it("will use explicit spacing", () => {
      const result = macro(0, 1, 2, 3);

      expect(result).toEqual({
        position,
        top: 0,
        right: 1,
        bottom: 2,
        left: 3
      })
    })

    it("will fill element", () => {
      const result = macro("fill");

      expect(result).toEqual({
        position,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      })
    })

    it("will fill element with offset", () => {
      const result = macro("fill", 10);

      expect(result).toEqual({
        position,
        top: 10,
        left: 10,
        right: 10,
        bottom: 10
      })
    })

    it("will fill element with dual offset", () => {
      const result = macro("fill", 10, 20);

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
        const result = macro(`fill-${dir}`);
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
        const result = macro(`fill-${dir}`, 10);
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