const native = require('./native.node');

native.litelib_initialize_existing('https://mainnet.lightwalletd.com:9067','')

function zingolibToZecwalletBalance() {
    const balanceStr = native.litelib_execute("balance", "");
    const balanceJSON = JSON.parse(balanceStr);

    let formattedJSON = {
      "uabalance": balanceJSON.orchard_balance,
      "zbalance": balanceJSON.sapling_balance,
      "verified_zbalance": balanceJSON.verified_sapling_balance,
      "spendable_zbalance": balanceJSON.spendable_sapling_balance,
      "unverified_zbalance": balanceJSON.unverified_sapling_balance,
      "tbalance": balanceJSON.transparent_balance,
      ua_addresses: [],
      z_addresses: [],
      t_addresses: []
    };

    // fetch all addresses
    const addressesStr = native.litelib_execute('addresses','');
    const addressesJSON = JSON.parse(addressesStr);

    // fetch all notes
    const notesStr = native.litelib_execute('notes','');
    const notesJSON = JSON.parse(notesStr);

    // construct ua_addresses with ther respective balance
    const ua_addr = addressesJSON
      .filter((a) => a.receivers.orchard_exists)
      .map((a) => {
    
      // To get the balance, sum all notes related to this address
      const ua_bal = notesJSON.unspent_orchard_notes
      .filter((o) => o.address === a.address)
      .reduce((acc, ua_unsp_note) => acc + ua_unsp_note.value, 0);
      
      // Also add pending notes
      const ua_pend_bal = notesJSON.pending_orchard_notes
        .filter((o) => o.address === a.address)
        .reduce((acc, ua_pend_note) => acc + ua_pend_note.value, 0);

      return {
        "address": a.address,
        "balance": ua_bal + ua_pend_bal
      }
    });

    // construct z_addresses with ther respective balance
    const z_addr = addressesJSON
    .filter((a) => a.receivers.sapling)
    .map((a) => {
    // To get the balance, sum all notes related to this address
      const z_bal = notesJSON.unspent_sapling_notes
        .filter((o) => o.address === a.address)
        .reduce((acc, z_unsp_note) => acc + z_unsp_note.value, 0)

      // Also add pending notes
      const z_pend_bal = notesJSON.pending_sapling_notes
        .filter((o) => o.address === a.address)
        .reduce((acc, z_pend_note) => acc + z_pend_note, 0)

      // To get spendable balance, filter the unspent sapling notes where spendable = true
      const z_spendable_bal = notesJSON.unspent_sapling_notes
        .filter((o) => o.address === a.address && o.spendable)
        .reduce((acc, z_spendable_note) => acc + z_spendable_note.value, 0)
      
      return {
        "address": a.receivers.sapling,
        "zbalance": z_bal + z_pend_bal,
        "verified_zbalance": z_bal,
        "spendable_zbalance": z_spendable_bal,
        "unverified_zbalance": z_pend_bal
      }
    });

    // construct z_addresses with ther respective balance
    const t_addr = addressesJSON
      .filter((a) => a.receivers.transparent)
      .map((a) => {
        // To get the balance, sum all UTXOs related to this address
        const t_bal = notesJSON.utxos
        .filter((o) => o.address === a.address)
        .reduce((acc, t_utxo) => acc + t_utxo.value, 0)

        // Also add pending UTXOs
        const t_pend_bal = notesJSON.pending_utxos
        .filter((o) => o.address === a.address)
        .reduce((acc, t_pend_utxo) => acc + t_pend_utxo, 0)

        return {
          address: a.receivers.transparent,
          balance: t_bal + t_pend_bal
        }
      })

    // set corresponding addresses in the formatted Json
    formattedJSON.ua_addresses = ua_addr;
    formattedJSON.z_addresses = z_addr;
    formattedJSON.t_addresses = t_addr;

    return formattedJSON;
}

function zingolibToZecwalletNotes() {
  // fetch all notes
  const notesStr = native.litelib_execute('notes', '');
  const notesJSON = JSON.parse(notesStr);

  // fetch all addresses
  const addressesStr = native.litelib_execute('addresses','');
  const addressesJSON = JSON.parse(addressesStr);

  let formattedJSON = {
    "unspent_notes": [],
    "pending_notes": [],
    "utxos": [],
    "pending_utxos": []
  };

  // Construct unspent_notes concatenating unspent_orchard_notes and unspent_sapling_notes
  const ua_unsp_notes = notesJSON.unspent_orchard_notes
  const z_unsp_notes = notesJSON.unspent_sapling_notes.map((z_unsp_note, idx) =>{
    // need to get the sapling address, instead of ua address
    const z_addr = addressesJSON.find((a) => a.address === z_unsp_note.address);
    z_unsp_note.address = z_addr.receivers.sapling;
    
    return z_unsp_note;
  });
  
  const unsp_notes = ua_unsp_notes.concat(z_unsp_notes);

  // Construct pending_notes concatenating pending_orchard_notes and pending_sapling_notes
  const ua_pend_notes = notesJSON.pending_orchard_notes
  const z_pend_notes = notesJSON.pending_sapling_notes.map((z_pend_note, idx) =>{
    // need to get the sapling address, instead of ua address
    const z_addr = addressesJSON.find((a) => a.address === z_pend_note.address);
    z_pend_note.address = z_addr.receivers.sapling;
    
    return z_pend_note;
  });
  
  const pend_notes = ua_pend_notes.concat(z_pend_notes);
  
  // construct utxos, replacing the addresses accordingly
  const utxos = notesJSON.utxos.map((utxo) => {
    // need to get the transparent address, instead of ua address
    const t_addr = addressesJSON.find((a) => a.address === utxo.address);
    utxo.address = t_addr.receivers.transparent;

    return utxo;
  });

  // construct pending_utxos, replacing the addresses accordingly
  const pending_utxos = notesJSON.pending_utxos.map((pend_utxo) => {
    // need to get the transparent address, instead of ua address
    const t_addr = addressesJSON.find((a) => a.address === pend_utxo.address);
    pend_utxo.address = t_addr.receivers.transparent;

    return pend_utxo;
  });


  // Set corresponding fields
  formattedJSON.unspent_notes = unsp_notes;
  formattedJSON.pending_notes = pend_notes;
  formattedJSON.utxos = utxos;
  formattedJSON.pending_utxos = pending_utxos;

  return formattedJSON;
}

function zingolibToZecwalletTxList() {
  // fetch transaction list
  const txListStr = native.litelib_execute("list", "");
  const txListJSON = JSON.parse(txListStr);

  // fetch all notes
  const notesStr = native.litelib_execute('notes', '');
  const notesJSON = JSON.parse(notesStr);

  // fetch all addresses
  const addressesStr = native.litelib_execute('addresses','');
  const addressesJSON = JSON.parse(addressesStr);

  // construct the list, changing ua addresses to sappling addresses, when suitable
  const newTxList = txListJSON.map((tx) => {
    const note = notesJSON.unspent_sapling_notes.find((n) => n.created_in_txid === tx.txid);    
    
    if(note) {
      const z_addr = addressesJSON.find((a) => a.address === tx.address);
      tx.address = z_addr.receivers.sapling;
    }

    return tx;
  })

  return newTxList;
}

const balance = zingolibToZecwalletBalance();
console.log(balance);

const notes = zingolibToZecwalletNotes();
console.log(notes);

const txList = zingolibToZecwalletTxList();
console.log(txList);


