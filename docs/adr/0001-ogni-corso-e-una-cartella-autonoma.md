# Ogni corso è una cartella autonoma corsi/NN-slug/ con presentazione, scaletta e laboratorio

Ogni corso vive in `corsi/NN-slug/`, dove `NN` è un numero progressivo a due cifre e `slug` un nome breve in italiano. Ogni cartella ha sempre le stesse tre parti: `presentazione/index.html`, `scaletta.md` e `lab/`. La radice del repo contiene solo ciò che è comune a tutti i corsi: istruzioni per gli agenti, glossario, decisioni, script e il catalogo dei plugin.

Il repo deve crescere per mesi senza riorganizzazioni. Con una cartella per corso, aggiungere un corso significa aggiungere una cartella e una riga nel README, senza toccare gli altri. Chi prepara una sessione trova tutto in un posto solo. Un corso si può anche copiare fuori dal repo e funziona lo stesso, perché la presentazione è un file HTML autonomo e il laboratorio contiene file veri. Il numero tiene l'ordine in cui i corsi vanno seguiti e rende stabili i link.

Diventa più facile aggiungere e ritirare corsi e fare review di una PR che tocca un solo corso. Diventa più difficile condividere materiale tra corsi: un esempio usato da due corsi o si duplica o vive in uno dei due e l'altro lo cita. Lo accettiamo finché i casi restano pochi.

## Considered Options

- **Cartelle per tipo (`presentazioni/`, `scalette/`, `laboratori/`).** Scartato: un corso finisce sparso in tre posti e ogni modifica tocca tre cartelle.
- **Un repo per corso.** Scartato: moltiplica permessi, convenzioni e CI, e il catalogo dei plugin andrebbe tenuto allineato tra più repo.
- **Slug senza numero.** Scartato: si perde l'ordine di fruizione e i nomi delle cartelle non dicono quale corso viene prima.
