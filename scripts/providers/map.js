$(function () {
  mapboxgl.accessToken = data_map.token;
  const SCRIPTS_DIR = "/scripts/providers";

  const sendClickEvent = (feature) => {
    const ev = new CustomEvent("mapClick", { bubbles: true, detail: feature });
    document.dispatchEvent(ev);
  };

  const map = new mapboxgl.Map({
    container: data_map.target_id,
    style: `${SCRIPTS_DIR}/style.json`,
    maxBounds: [
      [-129.409591, 31.134156], // Southwest coordinates
      [-110.131211, 42.900518] // Northeast coordinates
    ],
    dragRotate: false,
    pitchWithRotate: false
  });

  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  map.on("mousemove", "counties", (e) => {
    map.getCanvas().style.cursor = "pointer";
    popup.setLngLat(e.lngLat);

    const county = e.features[0].properties.county;
    const numProviders = e.features[0].properties.num_providers;

    let numProvidersString = numProviders + " transit provider";
    numProvidersString += (numProviders === 1) ? "" : "s";

    if (county) {
      popup.setHTML(`
        <strong>${county}</strong><br />
        ${numProvidersString}
      `);

      popup.addTo(map);
    }
  });

  map.on("mouseleave", "counties", () => {
    map.getCanvas().style.cursor = "default";
    popup.remove();
  });

  map.on("click", "counties", (e) => {
    sendClickEvent(e.features[0]);
  });

  map.on("load", () => {
    map.addSource("counties", {
      type: "geojson",
      data: data_map.data_file
    });

    map.fitBounds([
      [-125.409591, 31.534156], // Southwest coordinates
      [-114.131211, 42.509518] // Northeast coordinates
    ], {
      linear: true
    });

    // add additional style layers for the county data
    $.get(`${SCRIPTS_DIR}/layers.json`, (data) => {
      data.forEach((element) => {
        element.layers.forEach((layer) => map.addLayer(layer, element.beforeId));
      });
    });
  });
});
