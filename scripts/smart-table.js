/*
   # Smart Tables

   "Smart Tables" are defined as tables with data that can be configured via HTML
   attributes. See the `contracts/view.html` file as an example. These Smart
   Tables use the "Tabulator" project and will import HTML tables based on their
   HTML markup.

   For more information regarding Tabulator's behavior, go here:
     http://tabulator.info/docs/4.9/data#table

   Here are some notes:

   - A Smart Table is denoted by a `data-role` of `smart-table`
   - The `data-filterable-cols` takes a comma-separated list of column names (the
     lowercase variant of the HTML table header. For example, a "Product" column
     in the table will have a column name of `product`.
   - If the URL has query parameters, then you can automatically filter the table
     data. Query parameters are in the format of `<table-id>-filter-<column-key>`.
     For example, to start filtering the "Product" column for the table with an
     id of `pre-approved-contracts` it'd look for a URL query parameter of
     `pre-approved-contracts-filter-product`.
 */
$(function () {
  function getRandomString() {
    return Math.random().toString(36).substring(7);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const smartTables = document.querySelectorAll('[data-role="smart-table"]');
  const buildPill = (body, colName) => `
    <div class="pill" data-column-name="${colName}">
      <span class="sr-only">Filtered by:</span>
      <span class="body">${body}</span>
  
      <button class="pill__close">
        <span class="sr-only">Clear filter</span>
      </button>
    </div>
  `;

  smartTables.forEach((tableContainer) => {
    let tableID = tableContainer.getAttribute('id');
    if (!tableID) {
      tableID = getRandomString();
      tableContainer.setAttribute('id', tableID);

      console.warn(`Smart Table does not have ID, automatically assigning #${tableID}`);
    }

    const filterableCols = tableContainer.getAttribute('data-filterable-cols').replace(/[ ]+/g, '').split(',');
    const pillContainer = tableContainer.querySelector('.filterable-table__pills');
    const table = tableContainer.querySelector('table');

    if (filterableCols.length > 0 && pillContainer === null) {
      console.warn(`Smart Table with ID of #${tableID} supports filtering but has no Pill Container.`);
      console.warn(tableContainer);
    }

    const pillFilters = new Set();
    new Tabulator(table, {
      layout: 'fitColumns',
      tableBuilt: function() {
        const columns = this.getColumnDefinitions();

        for (const column of columns) {
          const field = column.field;
          const urlQuery = `${tableID}-filter-${field}`;

          if (urlParams.has(urlQuery)) {
            this.addFilter(field, 'like', urlParams.get(urlQuery));
          }
        }
      },
      dataFiltered: function (filters) {
        for (const filter of filters) {
          const colName = filter.field;
          const cellValue = filter.value;

          if (pillFilters.has(cellValue)) {
            continue;
          }

          const $pill = $(buildPill(cellValue, colName));
          $pill.find('.pill__close').on('click', () => {
            pillContainer.removeChild($pill[0]);
            pillFilters.delete(cellValue);

            this.removeFilter(colName, 'like', cellValue);
          });

          pillContainer.prepend($pill[0]);
          pillFilters.add(cellValue);
        }
      },
      cellClick: function(e, cell) {
        const colDefinition = cell.getColumn().getDefinition();
        const colName = colDefinition['field'];

        if (pillContainer === null || filterableCols.indexOf(colName) < 0) {
          return;
        }

        /** @type {Array<{field: string, type: string, value: any}>} */
        const filters = this.getFilters();
        const filterExists = filters.some(filter => filter.field === colName);
        const cellValue = cell.getValue().trim();

        if (!filterExists) {
          this.addFilter(colName, 'like', cellValue);
        }
      },
    });
  });
});
