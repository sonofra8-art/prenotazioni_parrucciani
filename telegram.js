// api/telegram.js
// Vercel Serverless Function - invia una notifica Telegram quando arriva una nuova prenotazione.
// Le credenziali (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) restano SOLO lato server
// (variabili d'ambiente Vercel) e non vengono mai incluse nella risposta o nei log.

export default async function handler(req, res) {
  // 1. Solo POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'Metodo non consentito. Usa POST.' });
  }

  try {
    const {
      nome,
      cognome,
      telefono,
      data_prenotazione,
      ora_prenotazione,
      numero_persone,
      note,
    } = req.body || {};

    // 3. Validazione campi obbligatori (note è opzionale)
    const campiMancanti = [];
    if (!nome) campiMancanti.push('nome');
    if (!cognome) campiMancanti.push('cognome');
    if (!telefono) campiMancanti.push('telefono');
    if (!data_prenotazione) campiMancanti.push('data_prenotazione');
    if (!ora_prenotazione) campiMancanti.push('ora_prenotazione');
    if (!numero_persone) campiMancanti.push('numero_persone');

    if (campiMancanti.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Campi obbligatori mancanti: ${campiMancanti.join(', ')}`,
      });
    }

    // 4. Variabili lette esclusivamente lato server
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      // Non esporre mai quale variabile manca in dettaglio, né il valore
      console.error('Configurazione Telegram mancante sul server (variabili ambiente non impostate).');
      return res.status(500).json({
        success: false,
        error: 'Configurazione del servizio di notifica non disponibile.',
      });
    }

    // Messaggio formattato
    const messaggio =
      `🍽️ NUOVA RICHIESTA DI PRENOTAZIONE\n\n` +
      `👤 Cliente: ${nome} ${cognome}\n` +
      `📞 Telefono: ${telefono}\n` +
      `📅 Data: ${data_prenotazione}\n` +
      `🕒 Orario: ${ora_prenotazione}\n` +
      `👥 Persone: ${numero_persone}\n` +
      `📝 Note: ${note && String(note).trim() !== '' ? note : 'Nessuna'}`;

    // 5. Invio tramite Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: messaggio,
      }),
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramResult.ok) {
      // 6. Log dell'errore SENZA includere token/credenziali
      console.error('Errore invio Telegram:', telegramResult.description || 'Errore sconosciuto');
      return res.status(502).json({
        success: false,
        error: 'Impossibile inviare la notifica Telegram.',
      });
    }

    // 7. Risposta di successo
    return res.status(200).json({
      success: true,
      message: 'Notifica Telegram inviata con successo.',
    });
  } catch (err) {
    console.error('Errore interno nella function telegram:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Errore interno del server.',
    });
  }
}
