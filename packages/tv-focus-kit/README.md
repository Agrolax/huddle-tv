# react-native-tv-focus-kit

[![npm](https://img.shields.io/npm/v/react-native-tv-focus-kit?style=flat-square)](https://www.npmjs.com/package/react-native-tv-focus-kit)
[![license: MIT](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)](https://github.com/Agrolax/huddle-tv/blob/main/packages/tv-focus-kit/LICENSE)

D-pad focus primitives for React Native TV apps: Vega OS (Fire TV), Android TV, tvOS. It depends only on `react` and `react-native`. Extracted from [Huddle Home](https://github.com/Agrolax/huddle-tv), where it runs the home screen grid.

Native "Cartesian" focus picks whatever is closest in the pressed direction. On an uneven widget grid that jumps around: Down from a wide tile lands on a random neighbour, and Up never returns to where you were. This kit computes the neighbour for each direction in plain TypeScript, tests it, and wires the result into `nextFocusUp/Down/Left/Right`.

## Install

```bash
npm install react-native-tv-focus-kit
```

Peer dependencies: `react` 18 or later and `react-native` 0.72 or later (or a TV fork such as `react-native-tvos` or Vega's `@amazon-devices/react-native-kepler`).

## What's in it
| Export | What |
|---|---|
| `FocusGrid` | Lays out cells on a rows × columns grid (cells can span), measures itself, and sets `nextFocus*` on every cell. Edges are left to the platform, so focus can still leave the grid. Remembers the last focused cell per row. |
| `FocusableCard` | A `Pressable` with an unmistakable focus state: animated scale + an inset ring + an optional focused style. No layout shift. Accepts `hasTVPreferredFocus` and `nextFocus*`. Children can be a render function `({focused}) => …`. |
| `FocusRing` | The ring on its own, drawn inside the card's bounds, so it never depends on `overflow: visible`. |
| `getNeighbor`, `buildNeighborMap`, `rememberFocus`, `validateGrid`, `readingOrder`, `moveInRow` | Pure navigation logic (no React) for your own components and tests. |

## Usage
```tsx
import {FocusGrid} from 'react-native-tv-focus-kit';

<FocusGrid
  gap={40}
  initialFocusId="clock"
  items={[
    {id: 'clock', row: 0, col: 0, render: ({focused}) => <Clock focused={focused} />},
    {id: 'calendar', row: 0, col: 1, colSpan: 2, render: () => <Calendar />, onPress: openCalendar},
    {id: 'profiles', row: 0, col: 3, render: () => <Profiles />},
    {id: 'tonight', row: 1, col: 0, colSpan: 2, render: () => <Tonight />},
  ]}
/>
```

Navigation rules (see `test/grid.test.ts`):
- **Left/Right** stay in the same row band and go to the nearest cell.
- **Up/Down** go to the nearest row band and pick the cell with the most column overlap (leftmost on a tie). If you focused a cell in that row before and it sits above/below you, you go back to it.
- A shorter next row never dead-ends: with no overlapping cell, the nearest one wins.
- Disabled cells are skipped. Overlapping or duplicate cells throw in dev.

On Vega, wrap the grid in `TVFocusGuideView autoFocus` (from `@amazon-devices/react-native-kepler`) so focus entering the grid from outside returns to the last cell.

## What ships
Compiled JavaScript and type definitions in `dist/`, plus the TypeScript source in `src/`. Metro picks the source through the `react-native` field. `apps/tv` in the Huddle repo is a runnable example: its Home grid is a `FocusGrid`.

## Develop
```bash
npm test -w react-native-tv-focus-kit
npm run typecheck -w react-native-tv-focus-kit
npm run build -w react-native-tv-focus-kit   # writes dist/
```

## Contributing
Issues and pull requests are welcome. See [CONTRIBUTING.md](https://github.com/Agrolax/huddle-tv/blob/main/CONTRIBUTING.md#tv-focus-kit).
