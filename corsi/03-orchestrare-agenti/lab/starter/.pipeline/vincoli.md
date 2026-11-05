# Vincoli della pipeline per acme-shop

Il supervisor approva un piano solo se li rispetta tutti. Ogni vincolo ha un nome in grassetto: il verdetto lo cita così com'è nel campo `constraint`.

1. **Importi in centesimi.** Ogni importo resta un numero intero di centesimi (ADR-0001). Niente virgola mobile in euro, niente tipi decimali.
2. **Nessuna dipendenza nuova.** `packages/core` non ha dipendenze esterne e resta così: niente pacchetti npm nuovi, niente import da pacchetti esterni.
3. **Perimetro.** Il piano modifica solo il file indicato dall'alert in `location.file`. Può aggiungere un file di test accanto.
4. **Firma pubblica.** Le funzioni esportate mantengono nome, parametri e tipo di ritorno: chi le chiama non deve cambiare.
5. **Test.** I test esistenti non si modificano. Una regola di business nuova ha un test nuovo.
6. **Testi in italiano.** Un messaggio per il cliente è in italiano e usa i termini di `CONTEXT.md`.
