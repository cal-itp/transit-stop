$(function () {
  let table;

  const buildDataTable = (data, dictionary) => {
    const col = (dict) => Object.assign({}, {
      title: dict.label,
      headerTooltip: dict.definition,
      field: dict.column
    });

    const textCol = (dict) => Object.assign({}, col(dict), {
      formatter: "textarea"
    });

    const numCol = (dict) => Object.assign({}, col(dict), {
      sorter: "number",
      sorterParams: {
        alignEmptyValues: "bottom"
      },
      formatter: "money",
      formatterParams: {
        precision: false
      }
    });

    const moneyCol = (dict) => Object.assign({}, numCol(dict), {
      formatterParams: {
        symbol: "$"
      }
    });

    const urlCol = (dict, label, textKey) => Object.assign({}, col(dict), {
      formatter: "link",
      title: label || dict.label,
      formatterParams: {
        labelField: textKey || dict.column,
        target: "_blank"
      }
    });

    const provider = dictionary.find(dict => dict.column === "provider");
    const cols = dictionary.map(dict => {
      switch (dict.type) {
        case "text":
          return textCol(dict)
        case "integer":
          return numCol(dict)
        case "money":
          return moneyCol(dict)
        case "url":
          return dict.column === "url" ? urlCol(dict, provider.label, provider.column) : urlCol(dict)
        default:
          console.log(`Unknown column type: ${dict}`);
      }
    });

    // hide the provider name column (duplicate, we have the link from url)
    // kept in the table to be used for sorting
    cols.find(c => c.field === "provider").visible = false;

    // freeze the url column on the left (for scrolling)
    cols.find(c => c.field === "url").frozen = true;

    // set a width on the main text columns to constrain stretching
    cols.filter(c => ["service_county", "contact_city"].indexOf(c.field) > -1).forEach(c => c.width = 175);

    // create the tabulator data table
    table = new Tabulator(`#${data_table.data_id}`, {
      layout: "fitData",
      data: data,
      columns: cols,
      height: "560px",
      pagination: false
    });

    return [data, dictionary];
  };

  const buildDictTable = (dictionary) => {
    // replace dictionary notes with markers
    let notes = { "": null };

    // unique notes
    const notesSet = dictionary
      .map((dict) => dict.notes)
      .filter((note) => note !== "")
      .filter((x, i, a) => a.indexOf(x) == i);

    // generate the replacement markers
    notesSet.forEach((note, i) => notes[note] = "*".repeat(i + 1));

    // replace
    dictionary.forEach((dict) => dict.notes = notes[dict.notes]);

    // create the dict table (don't keep a reference)
    new Tabulator(`#${data_table.dict_id}`, {
      layout: "fitDataTable",
      data: dictionary,
      autoColumns: true,
      autoColumnsDefinitions: (definitions) => {
        // disable sort
        definitions.forEach((column) => {
          column.headerSort = false;
        });
        // remove type column
        definitions = definitions.filter((column) => column.field !== "type");
        // wrap column name in code tag
        definitions.find((column) => column.field === "column").formatter = (cell) => `<code>${cell.getValue()}</code>`;
        return definitions;
      },
      pagination: false
    });

    return dictionary;
  };

  const refresh = (county) => {
    if (county && county !== "") {
      // filter where service_county column contains county
      table.setFilter("service_county", "like", county);
    }
    else {
      // clear programmatic filters
      table.clearFilter(true);
    }

    // although not intuitive, this sorts by service_county and then provider
    table.setSort([
      { column: "provider", dir: "asc" },
      { column: "service_county", dir: "asc" }
    ]);
  };

  const pill = $("<button />").addClass("btn-county").attr("aria-label", "Clear").on("click", () => clearPill());
  const makePill = (data) => {
    if (data && data.county && data.num_providers) {
      pill.text(`${data.county} (${data.num_providers})`);
      $(`#${data_table.data_id}`).parents("aside").prepend(pill);
    }
  };
  const clearPill = () => {
    pill.detach();
    refresh();
  };

  const handleClick = (e) => {
    if (e && e.detail) {
      const data = e.detail;
      refresh(data.properties.county);
      makePill(data.properties);
    }
    else {
      clearPill();
    }
  };

  document.addEventListener("mapClick", handleClick);

  const dataFiles = [data_table.data_file, data_table.dict_file];
  const jobs = dataFiles.map((dataFile) => $.get(dataFile, (data) => data));

  Promise.all(jobs)
    .then(([data, dictionary]) => buildDataTable(data, dictionary))
    .then(([_, dictionary]) => buildDictTable(dictionary))
    .then(() => refresh());
});