### A web application to visualize ISOXML (ISO11783-10) files

This is a pure browser application for rendering ISOXML ([ISO11783-10](https://www.iso.org/standard/61581.html)) TaskSets. It uses [Deck.gl](https://deck.gl/) visualization library for rendering on the map. ISOXML parsing is done using [ISOXML.js](https://github.com/dev4Agriculture/isoxml-js) library.

Main features:
  * Grids:
    * Both Grid Type 1 and Grid Type 2 are supported
    * Multiple Process Data Variables in a grid are not supported
  * Time Logs:
    * Select different DataLogValues to render on the map
    * Outliers removal
    * Fill missing values with the last value
  * Task fields
  * The user can click on the map to see the exact value of the clicked entity (Grid cell or TimeLog item)

[Try it out: Demo!](https://d3emrh4jlarcc4.cloudfront.net/index.html)

### Install and Start

```
npm i @craco/craco@7.0.0-alpha.8
npm i -D @craco/types --legacy-peer-deps
npm i react-scripts --legacy-peer-deps
npm i deck.gl --legacy-peer-deps
npm run build
npm start
```
