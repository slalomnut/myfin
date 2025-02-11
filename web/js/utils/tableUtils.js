export const tableUtils = {
  setupStaticTable: (tableID, onDrawCallback, ordering = false) => {
    $(tableID).DataTable({
      /*"order": [[0, "desc"]], */
      'ordering': ordering,
      'lengthChange': true,
      'pageLength': 50,
      'language': {
        'lengthMenu': '',/*"A mostrar _MENU_ registos por página",*/
        'zeroRecords': 'Nenhum registo encontrado',
        'info': 'A mostrar a página _PAGE_ de _PAGES_',
        'infoEmpty': 'Nenhum registo encontrado',
        'infoFiltered': '(filtrado de um total de _MAX_ registos)',
        'search': 'Pesquisa:',
        'paginate': {
          'next': 'Página Seguinte',
          'previous': 'Página Anterior',
        },
      },
      drawCallback: onDrawCallback,
    })
  },
  setupStaticTableWithCustomColumnWidths: (tableID, customColumnWidths, onDrawCallback, ordering = false) => {
    $(tableID).DataTable({
      /*"order": [[0, "desc"]],*/
      'ordering': ordering,
      'lengthChange': false,
      'pageLength': 50,
      'columnDefs': customColumnWidths,
      'language': {
        'lengthMenu': '',/*"A mostrar _MENU_ registos por página",*/
        'zeroRecords': 'Nenhum registo encontrado',
        'info': 'A mostrar a página _PAGE_ de _PAGES_',
        'infoEmpty': 'Nenhum registo encontrado',
        'infoFiltered': '(filtrado de um total de _MAX_ registos)',
        'search': 'Pesquisa:',
        'paginate': {
          'next': 'Página Seguinte',
          'previous': 'Página Anterior',
        },
      },
      drawCallback: onDrawCallback,
    })
  },
}

//# sourceURL=js/utils/tableUtils.js