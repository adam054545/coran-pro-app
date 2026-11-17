CORAN APP PRO — INSTALLATION

1) Ouvre le dossier coran-app-pro dans Visual Studio Code.
2) Installe l'extension "Live Server" dans VS Code si elle n'est pas déjà installée.
3) Ouvre index.html, puis clique sur "Go Live" en bas à droite.
4) Le navigateur s'ouvre sur une adresse locale http://127.0.0.1:5500 (ou similaire).
5) Sur Android, ouvre l'adresse HTTPS/locale accessible depuis ton téléphone. Pour tester sur le même Wi-Fi, Live Server doit écouter sur le réseau local et le pare-feu doit autoriser la connexion.
6) Pour une vraie installation Android simple, publie le dossier sur un hébergement HTTPS, puis ouvre l'adresse dans Chrome Android et choisis "Installer l'application" ou menu ⋮ > "Ajouter à l'écran d'accueil".

IMPORTANT
- Ne double-clique pas simplement index.html en file:// pour tester l'installation PWA. Le service worker et l'installation nécessitent localhost ou HTTPS.
- Les données du Coran, traductions et audios sont chargés en ligne via AlQuran Cloud.
- Les horaires de prière et la date hijri sont chargés via AlAdhan. Vérifie toujours les horaires avec ta mosquée locale : les méthodes de calcul peuvent différer.
- Le mode hors connexion garde l'interface de base en cache. Les sourates et audios qui n'ont pas été téléchargés/visités ne sont pas garantis hors connexion.
- Les favoris, réglages, marque-page et compteur sont stockés localement dans le navigateur. Ils ne sont pas synchronisés entre appareils.
- La traduction française fournie par l'API est celle de Muhammad Hamidullah.
- Les noms de récitateurs proposés dépendent de la disponibilité des fichiers audio sur le CDN. Si un fichier ne se lance pas, choisis un autre réciteur.

FICHIERS
index.html          Structure de l'application
style.css           Design responsive vert émeraude et doré
app.js              Fonctionnalités et appels API
manifest.webmanifest Configuration installable PWA
service-worker.js   Cache de l'interface
assets/icon.svg     Icône de l'application
