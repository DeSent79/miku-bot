# Miku Music Bot
## Bot commands
- `!play <track name>` play track by name or author (any key work in title).
- `!stop` stop bot from playing.
- `!random` bot starts to play all of uploaded tracks in random order non-stop. Sending this command second time will stop playing.
- `!skip` skips one track in queue.
- `!roll` gives random number between 0 and 100.
- `!roll <number from 0 to 999999>` gives random number between 0 and argument.
- `!count`displays uploaded tracks count.
- `!+1` rates current playing track +1.
- `!-1` rates current playing track -1.
## Usage
Bot requires Node.js 12+ and MongoDB running on the machine.  
*This is an example bot token*
```js
const { MikuBot } = require('miku-bot');
new MikuBot('NDYxMjIxMjU4NjIxNzQ3MjMx.WzJ3xQ.A-AIWELD8E5gjBlSm_hQCrHR-fY');
```
