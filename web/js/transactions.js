import { LayoutUtils } from './utils/layoutUtils.js'
import { LocalDataManager } from './utils/localDataManager.js'
import { ValidationUtils } from './utils/validationUtils.js'
import { DialogUtils } from './utils/dialogUtils.js'
import { PickerUtils } from './utils/pickerUtils.js'
import { tableUtils } from './utils/tableUtils.js'
import { LoadingManager } from './utils/loadingManager.js'
import { TransactionServices } from './services/transactionServices.js'
import { DateUtils } from './utils/dateUtils.js'
import { StringUtils } from './utils/stringUtils.js'

export var Transactions = {
  getTransactions: (fetchLimit = MYFIN.TRX_FETCH_LIMIT) => {
    LoadingManager.showLoading()
    TransactionServices.getAllTransactions(fetchLimit,
      (response) => {
        // SUCCESS
        LoadingManager.hideLoading()
        Transactions.initTables(response)
      },
      (response) => {
        // FAILURE
        LoadingManager.hideLoading()

      })
  },
  initTables: (dataset) => {
    $('#table-transactions-wrapper').html(Transactions.renderTable(dataset)
      +
      `<p class="right-align grey-text text-accent-4 projections-table-footnotes" style="font-size: small">* Por defeito, esta pesquisa apenas devolve as últimas ${MYFIN.TRX_FETCH_LIMIT} transações.<br><a id="get-all-trxs-footnote-btn" style="cursor:pointer;">Clique aqui para recuperar a lista completa.</a></p>`)
    tableUtils.setupStaticTable('#transactions-table', () => {
      // Click listener for edit trx click
      Transactions.bindClickListenersForEditAction()
      // Click listener for delete trx click
      Transactions.bindClickListenersForRemoveAction()
    })
    $("#get-all-trxs-footnote-btn").click(() => Transactions.getTransactions(999999999999999))
    $(document).ready(function () {
      $('select').formSelect()
    })

    LoadingManager.hideLoading()
  },
  bindClickListenersForEditAction: () => {
    $('.table-action-icons.action-edit-trx').each(function () {
      $(this).on('click', function () {
        Transactions.showEditTransactionModal(
          this.dataset.trxId,
          this.dataset.trxAmount,
          this.dataset.dateTimestamp,
          this.dataset.entityId,
          this.dataset.categoryId,
          this.dataset.accountFromId,
          this.dataset.accountToId,
          this.dataset.trxType,
          this.dataset.description,
          this.dataset.isEssential,
        )
      })
    })
  },
  bindClickListenersForRemoveAction: () => {
    $('.table-action-icons.action-delete-trx').each(function () {
      $(this).on('click', function () {
        Transactions.showRemoveTransactionModal(this.dataset.trxId)
      })
    })
  },
  renderTable: (entitiesList) => {
    return `
            <table id="transactions-table" class="display browser-defaults" style="width:100%">
        <thead>
            <tr>
                <th>Data</th>
                <th>Fluxo</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Ações</th>
            </tr>
        </thead>
        <tbody>
        ${entitiesList.map(trx => Transactions.renderRow(trx)).join('')}
        </tbody>
        </table>
        `
  },
  renderRow: trx => {
    return `
            <tr data-id='$trx.transaction_id'>
                <td style="text-align: center;">
                    <span><b>${DateUtils.getDayNumberFromUnixTimestamp(
      trx.date_timestamp)}</b></span><br>${DateUtils.getMonthShortStringFromUnixTimestamp(
      trx.date_timestamp)} '${DateUtils.getShortYearFromUnixTimestamp(
      trx.date_timestamp)}         
                </td>
                <td>${Transactions.formatTypeToString(trx.type,
      trx.account_from_name, trx.account_to_name)}</td>
                <td>${trx.is_essential == true
      ? LayoutUtils.buildEssentialTransactionBadge()
      : ''}  ${trx.description}<p><i class="inline-icon material-icons">folder_shared</i>  ${(trx.category_name)
      ? trx.category_name
      : '<span class=\'medium-gray-color\'>Sem Categoria</span>'}&nbsp;&nbsp;&nbsp;<i class="inline-icon material-icons">business</i> ${(trx.entity_name)
      ? trx.entity_name
      : '<span class=\'medium-gray-color\'>Sem Entidade</span>'}</p></td>
                <td>${Transactions.formatCurrencyColumn(trx.type,
      StringUtils.formatMoney(trx.amount))}</td>
                <td>
                    <i id="edit-${trx.transaction_id}"
                     data-trx-id="${trx.transaction_id}"
                     data-trx-amount="${trx.amount}"
                     data-date-timestamp="${trx.date_timestamp}"
                     data-entity-id="${trx.entity_id ? trx.entity_id : ''}"
                     data-category-id="${trx.categories_category_id ? trx.categories_category_id : ''}"
                     data-account-from-id="${trx.accounts_account_from_id ? trx.accounts_account_from_id : ''}"
                     data-account-to-id="${trx.accounts_account_to_id ? trx.accounts_account_to_id : ''}"
                     data-trx-type="${trx.type}"
                     data-description="${StringUtils.removeLineBreaksFromString(trx.description)}"
                     data-is-essential="${trx.is_essential}"
                     class="material-icons table-action-icons action-edit-trx">create</i>
                    <i data-trx-id="${trx.transaction_id}" class="material-icons table-action-icons action-delete-trx" style="margin-left:10px">delete</i>
                </td>
            </tr>

        `
  },
  formatCurrencyColumn: (type, formattedCurrencyString) => {
    switch (type) {
      case 'I':
        return `<span style="height: auto !important;font-weight: bold;" class='badge green-text text-accent-6'>${formattedCurrencyString}</span>`
        break
      case 'E':
        return `<span style="height: auto !important;font-weight: bold;" class='badge pink-text text-accent-1'>${formattedCurrencyString}</span>`
        break
      case 'T':
      default:
        return `<spa style="height: auto !important;font-weight: bold;" class='badge orange-text text-accent-2'>${formattedCurrencyString}</span>`
        break
    }
  },
  formatTypeToString: (type, acc_from, acc_to) => {
    //'badge green lighten-5 green-text text-accent-4' : 'badge pink lighten-5
    // pink-text text-accent-1'
    let str = type

    if (!acc_from || acc_from ==
      '') {
      acc_from = `<span style="color:gray">Conta Externa</span>`
    }
    if (!acc_to || acc_to ==
      '') {
      acc_to = `<span style="color:gray">Conta Externa</span>`
    }

    //return `<span style="height: auto !important;">(${acc_from} <br>⮕
    // ${acc_to})</span></span>`;
    return `<span style="height: auto !important;"><i class="inline-icon material-icons">arrow_back</i>${acc_from}<br><i class="inline-icon material-icons">arrow_forward</i>${acc_to}</span>`

    /*switch (type) {
        case 'I':
            return `<span style="height: auto !important;" class='badge green lighten-5 green-text text-accent-6'>(${acc_from} ⮕ ${acc_to})</span></span>`
            break;
        case 'E':
            return `<span style="height: auto !important;" class='badge pink lighten-5 pink-text text-accent-1'>(${acc_from} ⮕ ${acc_to})</span>`
            break;
        case 'T':
            return `<spa style="height: auto !important;"n class='badge brown darken-2 white-text text-accent-2'>(${acc_from} ⮕ ${acc_to})</span>`
            break;
    }


    return `<span style="height: auto !important;" class='badge brown darken-2 white-text text-accent-2'>(${acc_from} ⮕ ${acc_to})</span>`*/

    /* return str; */
  },
  showAddTransactionModal: () => {
    LoadingManager.showLoading()
    const lastTrxInputData = LocalDataManager.getLastTrxInputData()
    TransactionServices.getAddTransactionStep0(
      (response) => {
        LoadingManager.hideLoading()
        const entitiesArr = response['entities']
        const categoriesArr = response['categories']
        const typesArr = response['type']
        const accountsArr = response['accounts']

        $('#modal-global').modal('open')
        let txt = `
                <div class="row row-no-margin-bottom">
                    <div class="input-field col s8">
                        <h4>Adicionar nova transação</h4>
                        <p id="cb-essential-wrapper" class="scale-transition scale-out">
                          <label>
                            <input id="cb-essential" type="checkbox" class="checkbox-indigo filled-in" />
                            <span>Essencial</span>
                          </label>
                        </p>
                    </div>
                    <div class="input-field col s4">
                        <span class="select2-top-label">Tipo de Transação</span>
                        <select class="select-trxs-types" name="types">
                            ${typesArr.map(
          type => Transactions.renderTypesSelectOptions(type)).join('')}
                        </select>
                        <a id="auto-categorize-btn" class="waves-effect waves-light btn purple-gradient-bg scale-transition scale-out"
                        style="margin: 10px 0;"><i class="material-icons left">lightbulb_outline</i>Auto-Categorizar</a>
                        
                    </div>
                </div>
                
                    <form class="col s12">
                        <div class="row row-no-margin-bottom">
                            <div class="input-field col s2">
                                <i class="material-icons prefix">euro_symbol</i>
                                <input id="trx_amount" type="number" step=".01" class="validate">
                                <label for="trx_amount">Valor (€)</label>
                            </div>
                             <div class="input-field col s3">
                                <i class="material-icons prefix">date_range</i>
                                <input id="trx_date" type="text" class="datepicker input-field">
                                <label for="trx_date">Data da transação</label>
                            </div>     
                            <div class="col s7">
                                <div class="input-field col s12">
                                    <i class="material-icons prefix">description</i>
                                    <textarea id="trx-description" class="materialize-textarea"></textarea>
                                    <label for="trx-description">Descrição</label>
                                </div>
                            </div>                        
                        </div>
                        <div class="row row-no-margin-bottom col s12">                     
                            <div class="input-field col s6">
                            <span class="select2-top-label">Conta Origem</span>
                                <select class="select-trxs-account_from" name="accounts" style="width: 100%;">
                                    <option disabled selected value="-1">Conta Origem</option>
                                    ${accountsArr.map(
          account => Transactions.renderAccountsSelectOptions(account)).
          join('')}
                                </select>
                                
                            </div>
                            <div class="input-field col s6">
                                <span class="select2-top-label">Conta Destino</span>
                                <select class="select-trxs-account_to" name="accounts" style="width: 100%;">
                                    <option disabled selected value="-1">Conta Destino</option>
                                    ${accountsArr.map(
          account => Transactions.renderAccountsSelectOptions(account)).
          join('')}
                                </select>
                            </div>
                         
                        </div>
                        <div class="row row-no-margin-bottom col s12">
                            <div class="input-field col s6">
                                <span class="select2-top-label">Categoria</span>
                                <select class="select-trxs-categories" name="categories" style="width: 100%;">
                                    ${categoriesArr.map(
          cat => Transactions.renderCategoriesSelectOptions(cat)).join('')}
                                </select>
                            </div>
                            <div class="input-field col s6">
                                <span class="select2-top-label">Entidade</span>
                                <select class="select-trxs-entities" name="entities" style="width: 100%;">
                                    ${entitiesArr.map(
          entity => Transactions.renderEntitiesSelectOptions(entity)).join('')}
                                </select>
                            </div> 
                        </div>                                 
                    </form>
                </div>
                `

        let actionLinks = `<a  class="modal-close waves-effect waves-green btn-flat enso-blue-bg enso-border white-text">Cancelar</a>
                    <a id="modal-action-add-trx" class="waves-effect waves-red btn-flat enso-salmon-bg enso-border white-text">Adicionar</a>`
        $('#modal-global .modal-content').html(txt)
        $('#modal-global .modal-footer').html(actionLinks)
        $('#modal-action-add-trx').click(() => Transactions.addTransaction())
        $('#auto-categorize-btn').click(() => Transactions.autoCategorizeButtonClicked())

        $('select.select-trxs-entities').select2({
          dropdownParent: '#modal-global',
          allowClear: true,
          placeholder: 'Sem Entidade',
        })
        $('select.select-trxs-account_to').
          select2({ dropdownParent: '#modal-global' })
        $('select.select-trxs-account_from').
          select2({ dropdownParent: '#modal-global' })
        $('select.select-trxs-types').
          select2({ dropdownParent: '#modal-global' }).
          on('select2:select', function (e) {
            Transactions.toggleEssentialCheckboxVisibility(e.params.data.id)
          })
        $('select.select-trxs-categories').select2({
          dropdownParent: '#modal-global',
          allowClear: true,
          placeholder: 'Sem Categoria',
        })
        $('.datepicker').datepicker({
          defaultDate: new Date(),
          setDefaultDate: true,
          format: 'dd/mm/yyyy',
          i18n: PickerUtils.getDatePickerDefault18nStrings(),
        })

        if (lastTrxInputData) {
          // Auto-fill fields with last trx input data
          $('select.select-trxs-entities').
            val(lastTrxInputData.entityId).
            trigger('change')
          $('select.select-trxs-account_to').
            val(lastTrxInputData.accountToId).
            trigger('change')
          $('select.select-trxs-account_from').
            val(lastTrxInputData.accountFromId).
            trigger('change')
          $('select.select-trxs-categories').
            val(lastTrxInputData.categoryId).
            trigger('change')
          if (lastTrxInputData.trxType) {
            $('select.select-trxs-types').
              select2('val', lastTrxInputData.trxType)
            Transactions.toggleEssentialCheckboxVisibility(
              lastTrxInputData.trxType)
          }
        }
        $('textarea#trx-description').on('change keyup paste', () => {
          const description = $('textarea#trx-description').val()
          if (description !== '') {
            LayoutUtils.scaleInElement('a#auto-categorize-btn')
          }
          else {
            LayoutUtils.scaleOutElement('a#auto-categorize-btn')
          }
        })
        Transactions.manageAccountsSelectAvailability()
      },
      (error) => {
        LoadingManager.hideLoading()
      })

  },
  toggleEssentialCheckboxVisibility: (selectedId) => {
    if (selectedId === MYFIN.TRX_TYPES.EXPENSE) {
      LayoutUtils.scaleInElement('p#cb-essential-wrapper')
    }
    else {
      LayoutUtils.scaleOutElement('p#cb-essential-wrapper')
    }
  },
  autoCategorizeButtonClicked: () => {
    const description = $('textarea#trx-description').val()
    LoadingManager.showLoading()
    TransactionServices.autoCategorizeTrxByDescription(description,
      (fillData) => {
        // SUCCESS
        LoadingManager.hideLoading()
        Transactions.autoFillAddNewTransactionFields(fillData)
      }, (err) => {
        // ERROR
        LoadingManager.hideLoading()
        DialogUtils.showErrorMessage()
      })
  },
  autoFillAddNewTransactionFields: (fillData) => {
    if (fillData['selectedCategoryID']) {
      $('select.select-trxs-categories').
        val(fillData['selectedCategoryID']).
        change()
    }
    if (fillData['selectedEntityID']) {
      $('select.select-trxs-entities').
        val(fillData['selectedEntityID']).
        change()
    }
    if (fillData['selectedAccountFromID']) {
      $('select.select-trxs-account_from').
        val(fillData['selectedAccountFromID']).
        change()
    }
    if (fillData['selectedAccountToID']) {
      $('select.select-trxs-account_to').
        val(fillData['selectedAccountToID']).
        change()
    }
    if (fillData['isEssential'] == true) {
      $('input#cb-essential').prop('checked', 'checked').change()
    }
  },
  manageAccountsSelectAvailability: () => {
    const accountFromSelect = $('select.select-trxs-account_from')
    const accountToSelect = $('select.select-trxs-account_to')
    const trxTypeSelect = $('select.select-trxs-types')
    const accountFromSelect2 = $('select.select-trxs-account_from2')
    const accountToSelect2 = $('select.select-trxs-account_to2')
    const trxTypeSelect2 = $('select.select-trxs-types2')

    Transactions.handleAccountsSelectAvailability(accountFromSelect,
      accountToSelect, trxTypeSelect.val())

    trxTypeSelect.change((resp) => {
      const selectedType = resp.target.value

      Transactions.handleAccountsSelectAvailability(accountFromSelect,
        accountToSelect, selectedType)
    })

    Transactions.handleAccountsSelectAvailability(accountFromSelect2,
      accountToSelect2, trxTypeSelect2.val())

    trxTypeSelect2.change((resp) => {
      const selectedType = resp.target.value

      Transactions.handleAccountsSelectAvailability(accountFromSelect2,
        accountToSelect2, selectedType)
    })
  },
  handleAccountsSelectAvailability: (
    accountFromSelect, accountToSelect, selectedType) => {

    switch (selectedType) {
      case 'E':
        // EXPENSE
        accountFromSelect.prop('disabled', false)
        accountToSelect.prop('disabled', true)
        accountToSelect.val('').trigger('change')
        break
      case 'I':
        // INCOME
        accountFromSelect.prop('disabled', true)
        accountToSelect.prop('disabled', false)
        accountFromSelect.val('').trigger('change')
        break
      case 'T':
        // TRANSFER
        accountFromSelect.prop('disabled', false)
        accountToSelect.prop('disabled', false)
    }
  },
  renderEntitiesSelectOptions: (entity) => `
        <option value="${entity.entity_id}">${entity.name}</option>
    `,
  renderAccountsSelectOptions: (acc) => `
        <option value="${acc.account_id}">${acc.name}</option>
    `,
  renderTypesSelectOptions: (type) => `
        <option value="${type.letter}">${type.name}</option>
    `,
  renderCategoriesSelectOptions: (cat) => `
        <option value="${cat.category_id}">${cat.name}</option>
    `,
  addTransaction: () => {
    const amount = $('input#trx_amount').val()
    const type = $('select.select-trxs-types').val()
    const isEssential = $('input#cb-essential').is(':checked')
    let account_from_id
    let account_to_id
    switch (type) {
      case 'E':
        account_from_id = $('select.select-trxs-account_from').val()
        break
      case 'I':
        account_to_id = $('select.select-trxs-account_to').val()
        break
      default:
        account_from_id = $('select.select-trxs-account_from').val()
        account_to_id = $('select.select-trxs-account_to').val()
        break
    }

    const description = StringUtils.removeLineBreaksFromString(
      $('textarea#trx-description').val())
    const entID = $('select.select-trxs-entities').val()
    const catID = $('select.select-trxs-categories').val()
    const date_timestamp = DateUtils.convertDateToUnixTimestamp(
      $('.datepicker').val())

    if (!ValidationUtils.checkIfFieldsAreFilled(
      [amount, type, date_timestamp])) {
      DialogUtils.showErrorMessage('Por favor, preencha todos os campos!')
      return
    }

    if (amount <= 0) {
      DialogUtils.showErrorMessage('O Campo Valor deve ser superior a zero!')
      return
    }

    LoadingManager.showLoading()
    LocalDataManager.setLastTrxInputData(type, account_from_id, account_to_id,
      catID, entID)
    TransactionServices.addTransaction(amount, type, description, entID,
      account_from_id, account_to_id, catID, date_timestamp, isEssential,
      (response) => {
        // SUCCESS
        LoadingManager.hideLoading()
        DialogUtils.showSuccessMessage('Transação adicionada com sucesso!')
        configs.goToPage('transactions', null, true)
      },
      (response) => {
        // FAILURE
        LoadingManager.hideLoading()
        DialogUtils.showErrorMessage(
          'Ocorreu um erro. Por favor, tente novamente mais tarde!')
      })
  },
  showRemoveTransactionModal: (trxID) => {
    $('#modal-global').modal('open')
    let txt = `
                <h4>Remover transação #<b>${trxID}</b></h4>
                <div class="row">
                    <p>Tem a certeza de que pretende remover esta transação?</p>
                    <b>Esta ação é irreversível!</b>

                </div>
                `

    let actionLinks = `<a  class="modal-close waves-effect waves-green btn-flat enso-blue-bg enso-border white-text">Cancelar</a>
            <a data-trx-id="${trxID}" class="waves-effect waves-red btn-flat enso-salmon-bg enso-border white-text modal-action-delete-trx">Remover</a>`
    $('#modal-global .modal-content').html(txt)
    $('#modal-global .modal-footer').html(actionLinks)

    // Click listener for delete trx click
    $('.modal-action-delete-trx').each(function () {
      $(this).on('click', function () {
        Transactions.removeTransaction(this.dataset.trxId)
      })
    })
  },
  removeTransaction: (trxID) => {
    if (!trxID) {
      return
    }

    LoadingManager.showLoading()
    TransactionServices.removeTransaction(trxID,
      (response) => {
        // SUCCESS
        LoadingManager.hideLoading()
        DialogUtils.showSuccessMessage('Transação removida com sucesso!')
        configs.goToPage('transactions', null, true)
      }),
      (response) => {
        // FAILURE
        LoadingManager.hideLoading()
        DialogUtils.showErrorMessage(
          'Ocorreu um erro. Por favor, tente novamente mais tarde!')
      }
  },
  showEditTransactionModal: (
    trxID, selectedAmount, selectedDateTimestamp, selectedEntityID,
    selectedCategoryID, selectedAccountFromID, selectedAccountToID,
    selectedTypeID, selectedDescription, isEssential) => {
    LoadingManager.showLoading()
    TransactionServices.getAddTransactionStep0(
      (response) => {
        LoadingManager.hideLoading()
        const entitiesArr = response['entities']
        const categoriesArr = response['categories']
        const typesArr = response['type']
        const accountsArr = response['accounts']

        $('#modal-global').modal('open')
        let txt = `
                    <div class="row row-no-margin-bottom">
                        <div class="input-field col s8">
                            <h4>Editar transação <b>#${trxID}</b></h4>
                            <p id="cb-essential-wrapper" class="scale-transition ${!selectedAccountToID ? 'scale-in' : 'scale-out'}">
                          <label>
                            <input id="cb-essential" type="checkbox"
                             ${isEssential == true ? 'checked="checked"' : ''}
                             class="checkbox-indigo filled-in" />
                            <span>Essencial</span>
                          </label>
                        </p>
                        </div>
                        <div class="input-field col s4">
                            <span class="select2-top-label">Tipo de Transação</span>
                            <select class="select-trxs-types" name="types">
                                ${typesArr.map(
          type => Transactions.renderTypesSelectOptions(type)).join('')}
                            </select>
                        </div>
                    </div>
                    <form class="col s12">
                        <div class="row row-no-margin-bottom">
                            <div class="input-field col s2">
                                <i class="material-icons prefix">euro_symbol</i>
                                <input id="trx_amount" type="number" step=".01" class="validate">
                                <label for="trx_amount" class="active">Valor (€)</label>
                            </div>
                            
                             <div class="input-field col s3">
                                <i class="material-icons prefix">date_range</i>
                                <input id="trx_date" type="text" class="datepicker input-field">
                                <label for="trx_date">Data da transação</label>
                            </div>
                            <div class="col s7">
                                <div class="input-field col s12">
                                    <i class="material-icons prefix">description</i>
                                    <textarea id="trx-description" class="materialize-textarea"></textarea>
                                    <label class="active" for="trx-description">Descrição</label>
                                </div>
                            </div>
                        </div>
                        <div class="row row-no-margin-bottom col s12">                     
                            <div class="input-field col s6">
                                <span class="select2-top-label">Conta Origem</span>
                                <select class="select-trxs-account_from" name="accounts" style="width: 100%;">
                                    <option disabled selected value="-1">Conta Origem</option>
                                    ${accountsArr.map(
          account => Transactions.renderAccountsSelectOptions(account)).
          join('')}
                                </select>
                                
                            </div>
                            <div class="input-field col s6">
                                <span class="select2-top-label">Conta Destino</span>
                                <select class="select-trxs-account_to" name="accounts" style="width: 100%;">
                                    <option disabled selected value="-1">Conta Destino</option>
                                    ${accountsArr.map(
          account => Transactions.renderAccountsSelectOptions(account)).
          join('')}
                                </select>
                            </div>
                        </div>
                        <div class="row row-no-margin-bottom col s12">
                            <div class="input-field col s6">
                                <span class="select2-top-label">Categoria</span>
                                <select class="select-trxs-categories" name="categories" style="width: 100%;">
                                    ${categoriesArr.map(
          cat => Transactions.renderCategoriesSelectOptions(cat)).join('')}
                                </select>
                            </div>
                            <div class="input-field col s6">
                                <span class="select2-top-label">Entidade</span>
                                <select class="select-trxs-entities" name="entities" style="width: 100%;">
                                    ${entitiesArr.map(
          entity => Transactions.renderEntitiesSelectOptions(entity)).join('')}
                                </select>
                            </div> 
                        </div>
                       
                        <div id="split-trx-wrapper" style="display: none;">
                            <hr>
                            <div class="row row-no-margin-bottom">
                                <div class="input-field col s2">
                                    <i class="material-icons prefix">euro_symbol</i>
                                    <input id="trx_amount_2" type="number" step=".01" class="validate" style="width: auto;">
                                    <label for="trx_amount_2">Valor (€)</label>
                                </div>
                                <div class="input-field col s6 offset-s1">
                                    <i class="material-icons prefix">description</i>
                                    <textarea id="trx-description2" class="materialize-textarea"></textarea>
                                    <label for="trx-description2">Descrição</label>
                                </div>
                                <div class="input-field col s3">
                                    <span class="select2-top-label" style="display: none;">Tipo de Transação</span>
                                    <select class="select-trxs-types2" name="types" style="width: 100% !important">
                                        ${typesArr.map(
          type => Transactions.renderTypesSelectOptions(type)).join('')}
                                    </select>
                                </div>
                            </div>
                            
                            <div class="row row-no-margin-bottom">                     
                                <div class="input-field col s6">
                                    <span class="select2-top-label">Conta Origem</span>
                                    <select class="select-trxs-account_from2" name="accounts" style="width: 100%;">
                                        <option disabled selected value="-1">Conta Origem</option>
                                        ${accountsArr.map(
          account => Transactions.renderAccountsSelectOptions(account)).
          join('')}
                                    </select>
                                    
                                </div>
                                <div class="input-field col s6">
                                    <span class="select2-top-label">Conta Destino</span>
                                    <select class="select-trxs-account_to2" name="accounts" style="width: 100%;">
                                        <option disabled selected value="-1">Conta Destino</option>
                                        ${accountsArr.map(
          account => Transactions.renderAccountsSelectOptions(account)).
          join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="row row-no-margin-bottom">
                                <div class="input-field col s6">
                                    <span class="select2-top-label">Categoria</span>
                                    <select class="select-trxs-categories2" name="categories" style="width: 100%;">
                                        ${categoriesArr.map(
          cat => Transactions.renderCategoriesSelectOptions(cat)).join('')}
                                    </select>
                                </div>
                                <div class="input-field col s6">
                                    <span class="select2-top-label">Entidade</span>
                                    <select class="select-trxs-entities2" name="entities" style="width: 100%;">
                                        ${entitiesArr.map(
          entity => Transactions.renderEntitiesSelectOptions(entity)).join('')}
                                    </select>
                                </div> 
                            </div>
                            <p>
                                      <label>
                                        <input id="cb-essential-split" type="checkbox"
                                         ${isEssential == true
          ? 'checked="checked"'
          : ''}
                                         class="checkbox-indigo filled-in" />
                                        <span>Essencial</span>
                                      </label>
                                    </p>
                        </div>
                        
                    </form>
                </div>
                `

        let actionLinks = `<a id="split-trx-btn" class="waves-effect waves-light btn right-align transparent-bordered-btn-blue" onclick="" style="margin: 10px; float:left;"><i class="material-icons left"><span id="split-trx-btn-icon-id">call_split</span></i><span id="split-trx-btn-text">Dividir Transação</span></a><a  class="modal-close waves-effect waves-green btn-flat enso-blue-bg enso-border white-text">Cancelar</a>
                    <a data-trx-id="${trxID}" class="waves-effect waves-red btn-flat enso-salmon-bg enso-border white-text modal-action-edit-trx">Editar</a>`

        $('#modal-global .modal-content').html(txt)
        $('#modal-global .modal-footer').html(actionLinks)

        $('select.select-trxs-entities').select2({
          dropdownParent: '#modal-global',
          allowClear: true,
          placeholder: 'Sem Entidade',
        })
        $('select.select-trxs-entities2').select2({
          dropdownParent: '#modal-global',
          allowClear: true,
          placeholder: 'Sem Entidade',
        })
        $('select.select-trxs-account_to').
          select2({ dropdownParent: '#modal-global' })
        $('select.select-trxs-account_from').
          select2({ dropdownParent: '#modal-global' })
        $('select.select-trxs-types').
          select2({ dropdownParent: '#modal-global' })
        $('select.select-trxs-account_to2').
          select2({ dropdownParent: '#modal-global' })
        $('select.select-trxs-account_from2').
          select2({ dropdownParent: '#modal-global' })
        $('select.select-trxs-types2').
          select2({ dropdownParent: '#modal-global' })
        $('select.select-trxs-categories').select2({
          dropdownParent: '#modal-global',
          allowClear: true,
          placeholder: 'Sem Categoria',
        })
        $('select.select-trxs-categories2').select2({
          dropdownParent: '#modal-global',
          allowClear: true,
          placeholder: 'Sem Categoria',
        })
        $('.datepicker').datepicker({
          defaultDate: new Date(
            DateUtils.convertUnixTimestampToDateFormat(selectedDateTimestamp)),
          setDefaultDate: true,
          format: 'dd/mm/yyyy',
          i18n: PickerUtils.getDatePickerDefault18nStrings(),
        })

        // AUTO-FILL
        $('input#trx_amount').val(selectedAmount)
        $('textarea#trx-description').val(selectedDescription)
        $('select.select-trxs-entities').
          val(selectedEntityID).
          trigger('change')
        $('select.select-trxs-account_to').
          val(selectedAccountToID).
          trigger('change')
        $('select.select-trxs-account_from').
          val(selectedAccountFromID).
          trigger('change')
        $('select.select-trxs-types').select2('val', selectedTypeID)
        $('select.select-trxs-types').
          select2().
          on('select2:select', function (e) {
            Transactions.toggleEssentialCheckboxVisibility(e.params.data.id)
          })
        $('select.select-trxs-categories').
          val(selectedCategoryID).
          trigger('change')

        $('select.select-trxs-categories2').
          val(selectedCategoryID).
          trigger('change')
        $('select.select-trxs-entities2').
          val(selectedEntityID).
          trigger('change')
        $('select.select-trxs-account_to2').
          val(selectedAccountToID).
          trigger('change')
        $('select.select-trxs-account_from2').
          val(selectedAccountFromID).
          trigger('change')
        $('select.select-trxs-types2').select2('val', selectedTypeID)
        $('select.select-trxs-types2').
          select2().
          on('select2:select', function (e) {
            Transactions.toggleEssentialCheckboxVisibility(e.params.data.id)
          })

        Transactions.manageAccountsSelectAvailability()

        // Click listener for edit trx click
        $('.modal-action-edit-trx').each(function () {
          $(this).on('click', function () {
            Transactions.editTransaction(this.dataset.trxId)
          })
        })

        $('a#split-trx-btn').on('click', function (view) {
          const wrapperLocator = $('div#split-trx-wrapper')
          const btnLocator = $('span#split-trx-btn-text')
          const btnIconLocator = $('span#split-trx-btn-icon-id')
          const amount1Locator = $('input#trx_amount')
          const amount2Locator = $('input#trx_amount_2')

          if (wrapperLocator.is(':visible')) {
            wrapperLocator.hide()
            btnLocator.text('Dividir Transação')
            btnIconLocator.text('call_split')

            // Sum to amount1 the value of amount2 (unless undefined)
            if (amount2Locator.val()) {

              amount1Locator.val((parseFloat(amount1Locator.val()) +
                parseFloat(amount2Locator.val())).toFixed(2))
            }

          }
          else {
            wrapperLocator.show()
            btnLocator.text('Unir Transações')
            btnIconLocator.text('call_merge')

            // Subtract from amount1 the value of amount2 (unless undefined)
            if (amount2Locator.val()) {
              amount1Locator.val((parseFloat(amount1Locator.val()) -
                parseFloat(amount2Locator.val())).toFixed(2))
            }

          }
        })

      },
      (error) => {
        LoadingManager.hideLoading()
      })

  },
  editTransaction: (trxID) => {
    const new_amount = $('input#trx_amount').val()
    const new_type = $('select.select-trxs-types').val()

    const new_is_essential = $('input#cb-essential').is(':checked')
    let new_account_from_id
    let new_account_to_id
    switch (new_type) {
      case 'E':
        new_account_from_id = $('select.select-trxs-account_from').val()
        break
      case 'I':
        new_account_to_id = $('select.select-trxs-account_to').val()
        break
      default:
        new_account_from_id = $('select.select-trxs-account_from').val()
        new_account_to_id = $('select.select-trxs-account_to').val()
        break
    }

    const new_description = StringUtils.removeLineBreaksFromString(
      $('textarea#trx-description').val())
    const new_entity_id = $('select.select-trxs-entities').val()
    const new_category_id = $('select.select-trxs-categories').val()
    const new_date_timestamp = DateUtils.convertDateToUnixTimestamp(
      $('.datepicker').val())

    let split_amount = null
    let split_category = null
    let split_entity = null
    let split_type = null
    let split_account_from = null
    let split_account_to = null
    let split_description = null
    let split_is_essential = new_is_essential
    const wrapperLocator = $('div#split-trx-wrapper')

    let isSplit = false

    if (wrapperLocator.is(':visible')) {
      isSplit = true
      split_amount = $('input#trx_amount_2').val()
      split_category = $('select.select-trxs-categories2').val()
      split_entity = $('select.select-trxs-entities2').val()
      split_type = $('select.select-trxs-types2').val()
      split_account_from = $('select.select-trxs-account_from2').val()
      split_account_to = $('select.select-trxs-account_to2').val()
      split_description = StringUtils.removeLineBreaksFromString(
        $('textarea#trx-description2').val())
      split_is_essential = $('input#cb-essential-split').is(':checked')
    }

    if (!ValidationUtils.checkIfFieldsAreFilled(
      [new_amount, new_type, new_date_timestamp])) {
      DialogUtils.showErrorMessage('Por favor, preencha todos os campos!')
      return
    }

    if (new_amount <= 0) {
      DialogUtils.showErrorMessage('O Campo Valor deve ser superior a zero!')
      return
    }

    if (isSplit) {
      if (!ValidationUtils.checkIfFieldsAreFilled([split_amount, split_type])) {
        DialogUtils.showErrorMessage('Por favor, preencha todos os campos!')
        return
      }

      if (split_amount <= 0) {
        DialogUtils.showErrorMessage('O Campo Valor deve ser superior a zero!')
        return
      }
    }

    LoadingManager.showLoading()

    TransactionServices.editTransaction(trxID, new_amount, new_type,
      new_description, new_entity_id, new_account_from_id, new_account_to_id,
      new_category_id, new_date_timestamp, new_is_essential,
      isSplit, split_amount, split_category, split_entity, split_type,
      split_account_from, split_account_to, split_description,
      split_is_essential,
      () => {
        // SUCCESS
        LoadingManager.hideLoading()
        DialogUtils.showSuccessMessage('Transação atualizada com sucesso!')
        configs.goToPage('transactions', null, true)
      },
      () => {
        // FAILURE
        LoadingManager.hideLoading()
        DialogUtils.showErrorMessage(
          'Ocorreu um erro. Por favor, tente novamente mais tarde!')
      })
  },
}

//# sourceURL=js/transactions.js