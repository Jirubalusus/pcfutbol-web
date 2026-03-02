// ============================================================
// WORLD CUP STORY ARCS — i18n Translations
// ============================================================
// Rich narrative text for all story arc chapters.
// Each chapter: title, desc, choiceA text (a), choiceB text (b)
// Variant chapters have nested variant keys.
// Supports: es, en, fr, de, pt, it
// ============================================================

export const STORY_ARC_EVENTS_I18N = {

  // ════════════════════════════════════════════
  // A. "La Promesa" (The Promise)
  // ════════════════════════════════════════════
  la_promesa_1: {
    es: { title: '📖 La Promesa', desc: 'El periodista más influyente del país te mira fijamente. "Señor míster, ¿promete usted a los 47 millones de españoles que traerá la copa a casa?" El silencio en la sala es total. Las cámaras graban. Tu respuesta definirá el torneo.', a: '"¡La copa viene con nosotros!" (Prometer victoria)', b: '"Daremos todo, pero respetamos a cada rival" (Humildad)' },
    en: { title: '📖 The Promise', desc: 'The country\'s most influential journalist stares at you. "Coach, do you promise the nation you\'ll bring the cup home?" Dead silence. Cameras rolling. Your answer will define this tournament.', a: '"The cup is coming home!" (Promise victory)', b: '"We\'ll give our all, but we respect every opponent" (Stay humble)' },
    fr: { title: '📖 La Promesse', desc: 'Le journaliste le plus influent du pays vous fixe. "Sélectionneur, promettez-vous à la nation de ramener la coupe ?" Silence total. Les caméras tournent. Votre réponse définira ce tournoi.', a: '"La coupe rentre à la maison !" (Promettre la victoire)', b: '"On donnera tout, mais on respecte chaque adversaire" (Humilité)' },
    de: { title: '📖 Das Versprechen', desc: 'Der einflussreichste Journalist des Landes starrt dich an. "Trainer, versprechen Sie der Nation, den Pokal nach Hause zu bringen?" Totale Stille. Kameras laufen. Deine Antwort wird das Turnier definieren.', a: '"Der Pokal kommt nach Hause!" (Sieg versprechen)', b: '"Wir geben alles, aber respektieren jeden Gegner" (Demütig bleiben)' },
    pt: { title: '📖 A Promessa', desc: 'O jornalista mais influente do país olha fixamente para si. "Mister, promete aos milhões de compatriotas que vai trazer a taça para casa?" Silêncio total. As câmaras gravam. A sua resposta definirá o torneio.', a: '"A taça vem connosco!" (Prometer vitória)', b: '"Daremos tudo, mas respeitamos cada rival" (Humildade)' },
    it: { title: '📖 La Promessa', desc: 'Il giornalista più influente del paese ti fissa. "Mister, promette alla nazione di portare la coppa a casa?" Silenzio totale. Le telecamere riprendono. La tua risposta definirà il torneo.', a: '"La coppa torna a casa!" (Promettere vittoria)', b: '"Daremo tutto, ma rispettiamo ogni avversario" (Umiltà)' },
  },

  la_promesa_2: {
    es: {
      title: '📖 La Promesa — Cap. 2',
      variants: {
        promised_victory: { desc: 'Tu promesa de victoria está en todos los titulares. Los fans la han convertido en cántico. La presión es brutal, pero el equipo siente que lucha por algo más grande. Un periodista te pregunta: "¿Reafirma su promesa?"', a: '"¡Más que nunca! ¡Vamos a ganar!" (Doblar la apuesta)', b: '"Bueno, lo importante es competir bien..." (Dar marcha atrás)' },
        stayed_humble: { desc: 'Tu humildad ha sorprendido a todos. Algunos medios te alaban por "refrescante". Otros dicen que "al míster le falta ambición". En el vestuario, los jugadores te miran esperando dirección.', a: 'Dar un discurso motivador al equipo', b: 'Mantener el perfil bajo y trabajar en silencio' },
      },
    },
    en: {
      title: '📖 The Promise — Ch. 2',
      variants: {
        promised_victory: { desc: 'Your victory promise is on every headline. Fans made it a chant. The pressure is crushing, but the team feels they\'re fighting for something bigger. A reporter asks: "Do you reaffirm your promise?"', a: '"More than ever! We WILL win!" (Double down)', b: '"Well, what matters is competing well..." (Walk it back)' },
        stayed_humble: { desc: 'Your humility surprised everyone. Some media praise you as "refreshing." Others say you "lack ambition." In the locker room, players look at you waiting for direction.', a: 'Give a motivational speech to the team', b: 'Keep the low profile and work in silence' },
      },
    },
    fr: {
      title: '📖 La Promesse — Ch. 2',
      variants: {
        promised_victory: { desc: 'Votre promesse de victoire fait tous les gros titres. Les fans en ont fait un chant. La pression est écrasante. Un journaliste demande : "Réaffirmez-vous votre promesse ?"', a: '"Plus que jamais ! On va gagner !"', b: '"L\'important c\'est de bien jouer..."' },
        stayed_humble: { desc: 'Votre humilité a surpris tout le monde. Certains médias vous louent, d\'autres disent que vous manquez d\'ambition.', a: 'Discours motivant à l\'équipe', b: 'Garder le profil bas' },
      },
    },
    de: {
      title: '📖 Das Versprechen — Kap. 2',
      variants: {
        promised_victory: { desc: 'Dein Siegversprechen ist in allen Schlagzeilen. Die Fans haben einen Gesang daraus gemacht. Der Druck ist enorm. Ein Reporter fragt: "Bestätigen Sie Ihr Versprechen?"', a: '"Mehr denn je! Wir WERDEN gewinnen!"', b: '"Das Wichtigste ist, gut zu spielen..."' },
        stayed_humble: { desc: 'Deine Bescheidenheit hat alle überrascht. Manche loben dich, andere sagen du hast keinen Ehrgeiz.', a: 'Motivationsrede an die Mannschaft', b: 'Weiter still arbeiten' },
      },
    },
    pt: {
      title: '📖 A Promessa — Cap. 2',
      variants: {
        promised_victory: { desc: 'A sua promessa de vitória está em todos os títulos. Os adeptos fizeram dela um cântico. A pressão é brutal. Um jornalista pergunta: "Reafirma a sua promessa?"', a: '"Mais do que nunca! Vamos ganhar!"', b: '"O importante é competir bem..."' },
        stayed_humble: { desc: 'A sua humildade surpreendeu todos. Alguns meios elogiam-no, outros dizem que lhe falta ambição.', a: 'Discurso motivador à equipa', b: 'Manter o perfil baixo' },
      },
    },
    it: {
      title: '📖 La Promessa — Cap. 2',
      variants: {
        promised_victory: { desc: 'La tua promessa di vittoria è su tutti i titoli. I tifosi ne hanno fatto un coro. La pressione è schiacciante. Un giornalista chiede: "Riconferma la sua promessa?"', a: '"Più che mai! Vinceremo!"', b: '"L\'importante è competere bene..."' },
        stayed_humble: { desc: 'La tua umiltà ha sorpreso tutti. Alcuni media ti lodano, altri dicono che ti manca ambizione.', a: 'Discorso motivazionale alla squadra', b: 'Mantenere il profilo basso' },
      },
    },
  },

  la_promesa_3: {
    es: {
      title: '📖 La Promesa — Cap. 3',
      variants: {
        doubled_down_promise: { desc: 'Semifinal. Tu promesa se ha convertido en un fenómeno nacional. La gente lleva camisetas con "LA PROMESA". Si ganas, serás leyenda. Si pierdes... no quieres ni pensarlo.', a: '"¡Hoy cumplimos la promesa!" (Todo o nada)', b: '"Olvidemos la promesa, juguemos con libertad"' },
        backtracked_promise: { desc: 'Diste marcha atrás y los medios te crucificaron. "El míster se arrugó", dicen. Pero el equipo está más relajado sin tanta presión. ¿Aprovechas o intentas recuperar la narrativa?', a: 'Recuperar el discurso: "Me equivoqué al dudar"', b: 'Aceptar las críticas y seguir trabajando' },
        humble_praised: { desc: 'Tu humildad se ha convertido en tu marca. Los medios internacionales te destacan como "el entrenador que no promete, cumple". El equipo te adora. Antes de la semifinal...', a: 'Discurso épico: "Hoy es NUESTRO día"', b: 'Como siempre: "Un partido más, paso a paso"' },
        humble_mocked: { desc: 'Las burlas continúan. "El míster sin ambición", te llaman. Pero tu equipo ha llegado lejos en silencio. Es tu momento para callar bocas o seguir en la sombra.', a: '"¡Ahora van a ver de lo que somos capaces!" (Rugir por fin)', b: 'Seguir en silencio (que hablen los resultados)' },
      },
    },
    en: {
      title: '📖 The Promise — Ch. 3',
      variants: {
        doubled_down_promise: { desc: 'Semifinal. Your promise has become a national phenomenon. People wear "THE PROMISE" t-shirts. Win and you\'re a legend. Lose... you don\'t want to think about it.', a: '"Today we fulfill the promise!" (All or nothing)', b: '"Forget the promise, let\'s play free"' },
        backtracked_promise: { desc: 'You walked it back and the media crucified you. "Coach lost his nerve," they say. But the team is more relaxed. Use it or try to reclaim the narrative?', a: 'Reclaim: "I was wrong to doubt us"', b: 'Accept criticism and keep working' },
        humble_praised: { desc: 'Your humility became your brand. International media highlight you as "the coach who doesn\'t promise, delivers." Team adores you. Before the semifinal...', a: 'Epic speech: "Today is OUR day"', b: 'As always: "One more match, step by step"' },
        humble_mocked: { desc: 'The mockery continues. "The coach with no ambition." But your team went far in silence. Time to shut them up or stay in the shadows.', a: '"Now they\'ll see what we\'re made of!" (Finally roar)', b: 'Stay silent (let results do the talking)' },
      },
    },
    fr: {
      title: '📖 La Promesse — Ch. 3',
      variants: {
        doubled_down_promise: { desc: 'Demi-finale. Votre promesse est devenue un phénomène national. Les gens portent des t-shirts "LA PROMESSE". Gagner = légende. Perdre = catastrophe.', a: '"Aujourd\'hui on tient la promesse !"', b: '"Oublions la promesse, jouons libre"' },
        backtracked_promise: { desc: 'Vous avez reculé et les médias vous ont crucifié. Mais l\'équipe est plus détendue.', a: '"J\'ai eu tort de douter"', b: 'Accepter les critiques et continuer' },
        humble_praised: { desc: 'Votre humilité est devenue votre marque. L\'équipe vous adore. Avant la demi-finale...', a: 'Discours épique', b: 'Comme toujours : un match de plus' },
        humble_mocked: { desc: 'Les moqueries continuent. Mais votre équipe est allée loin en silence.', a: '"Maintenant ils vont voir !" (Rugir enfin)', b: 'Rester silencieux' },
      },
    },
    de: {
      title: '📖 Das Versprechen — Kap. 3',
      variants: {
        doubled_down_promise: { desc: 'Halbfinale. Dein Versprechen ist ein nationales Phänomen. Leute tragen "DAS VERSPRECHEN"-T-Shirts. Gewinnst du, bist du eine Legende.', a: '"Heute halten wir das Versprechen!"', b: '"Vergessen wir das Versprechen, spielen wir frei"' },
        backtracked_promise: { desc: 'Du bist zurückgerudert und die Medien haben dich gekreuzigt. Aber das Team ist entspannter.', a: '"Ich lag falsch zu zweifeln"', b: 'Kritik akzeptieren und weiterarbeiten' },
        humble_praised: { desc: 'Deine Bescheidenheit wurde dein Markenzeichen. Das Team liebt dich. Vor dem Halbfinale...', a: 'Epische Rede: "Heute ist UNSER Tag"', b: 'Wie immer: ein Spiel nach dem anderen' },
        humble_mocked: { desc: 'Der Spott geht weiter. Aber dein Team kam weit. Zeit, sie zum Schweigen zu bringen.', a: '"Jetzt werden sie sehen!" (Endlich brüllen)', b: 'Still bleiben' },
      },
    },
    pt: {
      title: '📖 A Promessa — Cap. 3',
      variants: {
        doubled_down_promise: { desc: 'Meia-final. A sua promessa tornou-se num fenómeno nacional. As pessoas usam t-shirts "A PROMESSA". Se ganhar, será lenda.', a: '"Hoje cumprimos a promessa!"', b: '"Esqueçam a promessa, joguem livres"' },
        backtracked_promise: { desc: 'Recuou e os media crucificaram-no. Mas a equipa está mais relaxada.', a: '"Errei ao duvidar de nós"', b: 'Aceitar as críticas e continuar' },
        humble_praised: { desc: 'A sua humildade tornou-se a sua marca. A equipa adora-o. Antes da meia-final...', a: 'Discurso épico: "Hoje é O NOSSO dia"', b: 'Como sempre: mais um jogo' },
        humble_mocked: { desc: 'As piadas continuam. Mas a equipa chegou longe em silêncio.', a: '"Agora vão ver!" (Rugir finalmente)', b: 'Continuar em silêncio' },
      },
    },
    it: {
      title: '📖 La Promessa — Cap. 3',
      variants: {
        doubled_down_promise: { desc: 'Semifinale. La tua promessa è diventata un fenomeno nazionale. La gente porta magliette "LA PROMESSA". Se vinci, sei leggenda.', a: '"Oggi manteniamo la promessa!"', b: '"Dimentichiamo la promessa, giochiamo liberi"' },
        backtracked_promise: { desc: 'Hai fatto marcia indietro e i media ti hanno crocifisso. Ma la squadra è più rilassata.', a: '"Ho sbagliato a dubitare"', b: 'Accettare le critiche e continuare' },
        humble_praised: { desc: 'La tua umiltà è diventata il tuo marchio. La squadra ti adora. Prima della semifinale...', a: 'Discorso epico: "Oggi è il NOSTRO giorno"', b: 'Come sempre: una partita alla volta' },
        humble_mocked: { desc: 'Le prese in giro continuano. Ma la tua squadra è arrivata lontano in silenzio.', a: '"Ora vedranno!" (Ruggire finalmente)', b: 'Restare in silenzio' },
      },
    },
  },

  la_promesa_4: {
    es: {
      title: '📖 La Promesa — Final',
      variants: {
        promise_all_in: { desc: 'La final. Fuiste all-in con la promesa. El país entero contiene el aliento. Las calles están vacías. Solo existe este partido. "LA PROMESA" está pintada en las gradas. Es ahora o nunca.', a: '"¡HOY CUMPLIMOS! ¡POR TODOS!" (Épico total)', b: '"Tranquilos. Somos los mejores. Demostrémoslo." (Confianza fría)' },
        promise_cracked: { desc: 'Llegaste a la final, pero tu credibilidad está rota. Los medios dicen que ganaste "pese al míster, no gracias a él". Los jugadores miran al capitán, no a ti. ¿Puedes recuperar su confianza?', a: '"Os he fallado. Pero hoy, juntos, escribimos historia." (Vulnerabilidad)', b: '"Olvidemos todo. Solo queda fútbol." (Pragmatismo)' },
        promise_redeemed: { desc: 'Te redimiste. Diste marcha atrás y luego volviste más fuerte. Los medios respetan tu honestidad. El equipo confía en ti. La final es tu vindicación definitiva.', a: '"Ahora sí: ESTA copa es nuestra." (Finalmente prometer)', b: '"Hagamos lo que mejor sabemos, sin más." (Humildad hasta el final)' },
        promise_forgotten: { desc: 'La promesa quedó en el olvido. Nadie la menciona ya. Estás en la final, pero sin narrativa. Sin épica. Solo fútbol. ¿Es suficiente?', a: 'Intentar crear un momento épico ahora', b: 'Simplemente jugar el partido' },
        humble_leader: { desc: 'Tu liderazgo silencioso te llevó a la final. Eres el anti-héroe. Sin promesas, sin titulares, solo resultados. Los jugadores harían cualquier cosa por ti. El mundo observa.', a: '"Esta vez... sí prometo algo. Prometo que lo daré TODO." (Romper el molde)', b: '"No cambio nada. Somos quienes somos. A ganar." (Fiel hasta el final)' },
        humble_boring: { desc: 'Llegaste a la final siendo "aburrido". Los medios quieren drama y tú solo das trabajo. Pero aquí estás. En la final.', a: 'Por una vez, dar un discurso apasionado', b: 'Ser tú mismo hasta el final' },
        humble_finally_roars: { desc: '¡RUGISTE! Después de semanas de silencio, tu explosión en la semifinal fue el momento del torneo. Los fans te adoran. El equipo va a la guerra contigo. La final te espera.', a: '"¡VAMOS A POR TODAS! ¡ES NUESTRO MOMENTO!" (Mantener la energía)', b: '"Ya lo dije todo. Ahora, a jugar." (Volver al silencio)' },
        humble_stays_quiet: { desc: 'Seguiste callado. El equipo ganó, pero nadie habla de ti. En la final, solo importa ganar. Pero sin narrativa, ¿hay motivación extra?', a: 'Intentar inspirar por última vez', b: 'Dejar que el fútbol hable' },
      },
    },
    en: {
      title: '📖 The Promise — Final',
      variants: {
        promise_all_in: { desc: 'The final. You went all-in on the promise. The entire country holds its breath. Streets are empty. Only this match exists. "THE PROMISE" is painted in the stands. Now or never.', a: '"TODAY WE DELIVER! FOR EVERYONE!" (Full epic)', b: '"Stay calm. We\'re the best. Let\'s prove it." (Cold confidence)' },
        promise_cracked: { desc: 'You reached the final, but your credibility is shattered. Media says you won "despite the coach." Players look at the captain, not you. Can you win them back?', a: '"I\'ve failed you. But today, together, we make history." (Vulnerability)', b: '"Forget everything. Only football remains." (Pragmatism)' },
        promise_redeemed: { desc: 'You redeemed yourself. Walked it back, then came back stronger. Media respects your honesty. The team trusts you. The final is your ultimate vindication.', a: '"Now yes: THIS cup is ours." (Finally promise)', b: '"Let\'s do what we do best, nothing more." (Humble to the end)' },
        promise_forgotten: { desc: 'The promise was forgotten. Nobody mentions it. You\'re in the final, but without a narrative. Without epic. Just football. Is it enough?', a: 'Try to create an epic moment now', b: 'Simply play the match' },
        humble_leader: { desc: 'Your quiet leadership got you to the final. You\'re the anti-hero. No promises, no headlines, just results. Players would do anything for you. The world watches.', a: '"This time... I do promise something. I promise I\'ll give EVERYTHING." (Break the mold)', b: '"I change nothing. We are who we are. Let\'s win." (True to the end)' },
        humble_boring: { desc: 'You reached the final being "boring." Media wants drama and you only give work. But here you are. In the final.', a: 'For once, give a passionate speech', b: 'Be yourself to the very end' },
        humble_finally_roars: { desc: 'YOU ROARED! After weeks of silence, your semifinal explosion was the moment of the tournament. Fans adore you. The team goes to war with you. The final awaits.', a: '"LET\'S GO ALL IN! THIS IS OUR MOMENT!" (Keep the energy)', b: '"I said everything. Now, let\'s play." (Return to silence)' },
        humble_stays_quiet: { desc: 'You stayed quiet. Team won, but nobody talks about you. In the final, only winning matters. But without a narrative, is there extra motivation?', a: 'Try to inspire one last time', b: 'Let the football speak' },
      },
    },
    fr: {
      title: '📖 La Promesse — Finale',
      variants: {
        promise_all_in: { desc: 'La finale. Vous avez tout misé sur la promesse. Le pays retient son souffle.', a: '"AUJOURD\'HUI ON TIENT LA PROMESSE !"', b: '"Restons calmes. On est les meilleurs."' },
        promise_cracked: { desc: 'Vous avez atteint la finale, mais votre crédibilité est brisée.', a: '"Je vous ai déçus. Mais aujourd\'hui, ensemble, on écrit l\'histoire."', b: '"Oublions tout. Il ne reste que le football."' },
        promise_redeemed: { desc: 'Vous vous êtes racheté. L\'équipe vous fait confiance.', a: '"Maintenant oui : cette coupe est la nôtre."', b: '"Faisons ce qu\'on fait le mieux."' },
        promise_forgotten: { desc: 'La promesse est oubliée. Vous êtes en finale, mais sans récit épique.', a: 'Essayer de créer un moment épique', b: 'Simplement jouer le match' },
        humble_leader: { desc: 'Votre leadership silencieux vous a mené en finale.', a: '"Cette fois... je promets quelque chose."', b: '"Je ne change rien. À gagner."' },
        humble_boring: { desc: 'Vous êtes arrivé en finale en étant "ennuyeux".', a: 'Pour une fois, un discours passionné', b: 'Rester vous-même' },
        humble_finally_roars: { desc: 'Vous avez RUGI ! Après des semaines de silence, votre explosion en demi-finale a tout changé.', a: '"ON Y VA À FOND !"', b: '"J\'ai tout dit. Maintenant, jouons."' },
        humble_stays_quiet: { desc: 'Vous êtes resté silencieux. L\'équipe a gagné, mais personne ne parle de vous.', a: 'Essayer d\'inspirer une dernière fois', b: 'Laisser le football parler' },
      },
    },
    de: {
      title: '📖 Das Versprechen — Finale',
      variants: {
        promise_all_in: { desc: 'Das Finale. Du hast alles auf das Versprechen gesetzt. Das ganze Land hält den Atem an.', a: '"HEUTE LIEFERN WIR! FÜR ALLE!"', b: '"Ruhig bleiben. Wir sind die Besten."' },
        promise_cracked: { desc: 'Du hast das Finale erreicht, aber deine Glaubwürdigkeit ist zerstört.', a: '"Ich habe euch enttäuscht. Aber heute schreiben wir Geschichte."', b: '"Vergesst alles. Nur Fußball zählt."' },
        promise_redeemed: { desc: 'Du hast dich rehabilitiert. Das Team vertraut dir.', a: '"Jetzt ja: DIESER Pokal gehört uns."', b: '"Machen wir was wir am besten können."' },
        promise_forgotten: { desc: 'Das Versprechen ist vergessen. Du bist im Finale, aber ohne Narrativ.', a: 'Einen epischen Moment kreieren', b: 'Einfach spielen' },
        humble_leader: { desc: 'Deine stille Führung brachte dich ins Finale.', a: '"Diesmal... verspreche ich etwas."', b: '"Ich ändere nichts. Auf geht\'s."' },
        humble_boring: { desc: 'Du kamst als "Langweiler" ins Finale.', a: 'Einmal eine leidenschaftliche Rede halten', b: 'Du selbst bleiben' },
        humble_finally_roars: { desc: 'Du hast GEBRÜLLT! Nach Wochen der Stille war deine Halbfinal-Explosion der Moment des Turniers.', a: '"VOLL DRAUF! DAS IST UNSER MOMENT!"', b: '"Ich habe alles gesagt. Jetzt spielen wir."' },
        humble_stays_quiet: { desc: 'Du bliebst still. Das Team gewann, aber niemand spricht über dich.', a: 'Ein letztes Mal inspirieren', b: 'Den Fußball sprechen lassen' },
      },
    },
    pt: {
      title: '📖 A Promessa — Final',
      variants: {
        promise_all_in: { desc: 'A final. Apostou tudo na promessa. O país inteiro prende a respiração.', a: '"HOJE CUMPRIMOS! POR TODOS!"', b: '"Calma. Somos os melhores. Vamos prová-lo."' },
        promise_cracked: { desc: 'Chegou à final, mas a sua credibilidade está destruída.', a: '"Falhei-vos. Mas hoje, juntos, fazemos história."', b: '"Esqueçam tudo. Só resta futebol."' },
        promise_redeemed: { desc: 'Redimiu-se. A equipa confia em si.', a: '"Agora sim: ESTA taça é nossa."', b: '"Façamos o que melhor sabemos."' },
        promise_forgotten: { desc: 'A promessa foi esquecida. Está na final, mas sem narrativa.', a: 'Tentar criar um momento épico', b: 'Simplesmente jogar' },
        humble_leader: { desc: 'A sua liderança silenciosa trouxe-o à final.', a: '"Desta vez... prometo algo."', b: '"Não mudo nada. Vamos ganhar."' },
        humble_boring: { desc: 'Chegou à final sendo "aborrecido".', a: 'Por uma vez, um discurso apaixonado', b: 'Ser si mesmo até ao fim' },
        humble_finally_roars: { desc: 'RUGIU! Após semanas de silêncio, a sua explosão na meia-final mudou tudo.', a: '"VAMOS COM TUDO!"', b: '"Já disse tudo. Agora, jogar."' },
        humble_stays_quiet: { desc: 'Continuou calado. A equipa ganhou, mas ninguém fala de si.', a: 'Tentar inspirar uma última vez', b: 'Deixar o futebol falar' },
      },
    },
    it: {
      title: '📖 La Promessa — Finale',
      variants: {
        promise_all_in: { desc: 'La finale. Hai puntato tutto sulla promessa. L\'intero paese trattiene il fiato.', a: '"OGGI MANTENIAMO LA PROMESSA!"', b: '"Calmi. Siamo i migliori. Dimostriamolo."' },
        promise_cracked: { desc: 'Hai raggiunto la finale, ma la tua credibilità è distrutta.', a: '"Vi ho deluso. Ma oggi, insieme, scriviamo la storia."', b: '"Dimentichiamo tutto. Resta solo il calcio."' },
        promise_redeemed: { desc: 'Ti sei riscattato. La squadra si fida di te.', a: '"Adesso sì: QUESTA coppa è nostra."', b: '"Facciamo ciò che sappiamo fare meglio."' },
        promise_forgotten: { desc: 'La promessa è dimenticata. Sei in finale, ma senza narrativa.', a: 'Provare a creare un momento epico', b: 'Semplicemente giocare' },
        humble_leader: { desc: 'La tua leadership silenziosa ti ha portato in finale.', a: '"Questa volta... prometto qualcosa."', b: '"Non cambio niente. Andiamo a vincere."' },
        humble_boring: { desc: 'Sei arrivato in finale essendo "noioso".', a: 'Per una volta, un discorso appassionato', b: 'Essere te stesso fino alla fine' },
        humble_finally_roars: { desc: 'HAI RUGGITO! Dopo settimane di silenzio, la tua esplosione in semifinale ha cambiato tutto.', a: '"ANDIAMO CON TUTTO!"', b: '"Ho detto tutto. Ora giochiamo."' },
        humble_stays_quiet: { desc: 'Sei rimasto in silenzio. La squadra ha vinto, ma nessuno parla di te.', a: 'Provare a ispirare un\'ultima volta', b: 'Lasciare parlare il calcio' },
      },
    },
  },

  // ════════════════════════════════════════════
  // B. "El Periodista" (The Journalist)
  // ════════════════════════════════════════════
  el_periodista_1: {
    es: { title: '📖 El Periodista', desc: 'Rueda de prensa previa al debut. Un periodista veterano, conocido por destruir carreras, se levanta. "Míster, sus tácticas en liga fueron desastrosas. ¿Qué le hace pensar que puede ganar un Mundial?" El silencio es incómodo. Todos esperan tu respuesta.', a: '"Mis tácticas nos trajeron aquí. ¿Las tuyas qué han ganado?" (Confrontar)', b: 'Sonreír y responder con calma: "Respetamos todas las opiniones" (Ignorar)' },
    en: { title: '📖 The Journalist', desc: 'Pre-debut press conference. A veteran journalist, known for destroying careers, stands up. "Coach, your league tactics were disastrous. What makes you think you can win a World Cup?" Uncomfortable silence. Everyone awaits your response.', a: '"My tactics got us here. What have yours ever won?" (Confront)', b: 'Smile calmly: "We respect all opinions" (Ignore)' },
    fr: { title: '📖 Le Journaliste', desc: 'Conférence de presse d\'avant-match. Un journaliste vétéran, connu pour détruire des carrières, se lève. "Vos tactiques en championnat étaient désastreuses. Qu\'est-ce qui vous fait croire que vous pouvez gagner ?"', a: '"Mes tactiques nous ont amenés ici. Les vôtres ?" (Confronter)', b: 'Sourire calmement : "Nous respectons toutes les opinions" (Ignorer)' },
    de: { title: '📖 Der Journalist', desc: 'Pressekonferenz vor dem Debüt. Ein Veteran-Journalist, bekannt dafür Karrieren zu zerstören, steht auf. "Ihre Liga-Taktik war katastrophal. Was macht Sie so sicher?"', a: '"Meine Taktik hat uns hierher gebracht. Was hat Ihre je gewonnen?" (Konfrontieren)', b: 'Ruhig lächeln: "Wir respektieren alle Meinungen" (Ignorieren)' },
    pt: { title: '📖 O Jornalista', desc: 'Conferência de imprensa antes da estreia. Um jornalista veterano, conhecido por destruir carreiras, levanta-se. "Mister, as suas táticas na liga foram desastrosas. O que o faz pensar que pode ganhar um Mundial?"', a: '"As minhas táticas trouxeram-nos aqui. As suas ganharam o quê?" (Confrontar)', b: 'Sorrir calmamente: "Respeitamos todas as opiniões" (Ignorar)' },
    it: { title: '📖 Il Giornalista', desc: 'Conferenza stampa pre-esordio. Un giornalista veterano, noto per distruggere carriere, si alza. "Mister, le sue tattiche in campionato sono state disastrose. Cosa la fa pensare di poter vincere un Mondiale?"', a: '"Le mie tattiche ci hanno portato qui. Le sue cosa hanno vinto?" (Confrontare)', b: 'Sorridere con calma: "Rispettiamo tutte le opinioni" (Ignorare)' },
  },

  el_periodista_2: {
    es: {
      title: '📖 El Periodista — Cap. 2',
      variants: {
        confronted_journalist: { desc: 'Tu confrontación fue viral. El periodista retrocedió públicamente, pero sus ojos prometían venganza. Ahora, en la segunda rueda, te espera con refuerzos: tres colegas listos para acorralarte. Pero... ¿y si le ofreces una exclusiva?', a: '"Adelante, preguntad lo que queráis." (Plantarle cara de nuevo)', b: 'Ofrecerle una exclusiva privada a cambio de paz' },
        ignored_journalist: { desc: 'Lo ignoraste y publicó un artículo devastador: "El míster que no aguanta la presión". Cita fuentes anónimas del vestuario. La presión mediática es insoportable. Un jugador clave fue señalado.', a: 'Denunciar públicamente las mentiras (alto riesgo)', b: 'Pagar a un gabinete de comunicación para controlar el daño' },
      },
    },
    en: {
      title: '📖 The Journalist — Ch. 2',
      variants: {
        confronted_journalist: { desc: 'Your confrontation went viral. The journalist retreated publicly, but his eyes promised revenge. Now, at the second presser, he\'s back with reinforcements: three colleagues ready to corner you. But... what if you offer him an exclusive?', a: '"Go ahead, ask whatever you want." (Stand your ground again)', b: 'Offer him a private exclusive in exchange for peace' },
        ignored_journalist: { desc: 'You ignored him and he published a devastating article: "The coach who can\'t handle pressure." Anonymous dressing room sources cited. Media pressure is unbearable. A key player was targeted.', a: 'Publicly denounce the lies (high risk)', b: 'Pay a PR firm to control the damage' },
      },
    },
    fr: {
      title: '📖 Le Journaliste — Ch. 2',
      variants: {
        confronted_journalist: { desc: 'Votre confrontation est devenue virale. Le journaliste revient avec des renforts.', a: '"Allez-y, demandez ce que vous voulez." (Tenir bon)', b: 'Lui proposer une exclusive en échange de la paix' },
        ignored_journalist: { desc: 'Vous l\'avez ignoré et il a publié un article dévastateur. Sources anonymes du vestiaire. La pression médiatique est insoutenable.', a: 'Dénoncer publiquement les mensonges', b: 'Engager une agence de communication' },
      },
    },
    de: {
      title: '📖 Der Journalist — Kap. 2',
      variants: {
        confronted_journalist: { desc: 'Deine Konfrontation ging viral. Der Journalist kommt mit Verstärkung zurück.', a: '"Fragen Sie, was Sie wollen." (Wieder standhalten)', b: 'Ein exklusives Interview anbieten' },
        ignored_journalist: { desc: 'Du hast ihn ignoriert und er hat einen verheerenden Artikel veröffentlicht. Anonyme Quellen aus der Kabine.', a: 'Die Lügen öffentlich anprangern', b: 'Eine PR-Firma bezahlen' },
      },
    },
    pt: {
      title: '📖 O Jornalista — Cap. 2',
      variants: {
        confronted_journalist: { desc: 'A sua confrontação tornou-se viral. O jornalista volta com reforços.', a: '"Perguntem o que quiserem." (Manter posição)', b: 'Oferecer-lhe uma exclusiva em troca de paz' },
        ignored_journalist: { desc: 'Ignorou-o e ele publicou um artigo devastador. Fontes anónimas do balneário citadas.', a: 'Denunciar publicamente as mentiras', b: 'Pagar uma agência de comunicação' },
      },
    },
    it: {
      title: '📖 Il Giornalista — Cap. 2',
      variants: {
        confronted_journalist: { desc: 'Il tuo scontro è diventato virale. Il giornalista torna con rinforzi.', a: '"Chiedete quello che volete." (Tenere duro)', b: 'Offrirgli un\'esclusiva in cambio di pace' },
        ignored_journalist: { desc: 'L\'hai ignorato e ha pubblicato un articolo devastante. Fonti anonime dallo spogliatoio.', a: 'Denunciare pubblicamente le bugie', b: 'Pagare un\'agenzia di PR' },
      },
    },
  },

  el_periodista_3: {
    es: {
      title: '📖 El Periodista — Desenlace',
      variants: {
        journalist_backed_off: { desc: 'El periodista se retiró. Sorpresa: publica una columna titulada "Me equivoqué con el míster". Se convierte en tu aliado inesperado. La presión baja dramáticamente. El equipo respira.', a: 'Aceptar su disculpa públicamente (alianza mediática)', b: 'Ignorar su artículo y centrarse en el fútbol' },
        journalist_bribed: { desc: 'El soborno funcionó... a medias. El periodista no ataca, pero otro colega sospecha y husmea. Si sale la verdad, será catastrófico. ¿Cortar lazos o hundirte más?', a: 'Confesar y pedir perdón públicamente (transparencia)', b: 'Pagar más para silenciar al segundo periodista' },
        journalist_published_lies: { desc: 'Las mentiras se multiplicaron. Tres periódicos repiten las acusaciones. Tu jugador estrella, señalado, amenaza con irse. Es el momento más oscuro. Pero... ¿y si contraatacas con la verdad?', a: '"¡BASTA! Aquí están los hechos." (Contraataque total)', b: 'Negociar en silencio con los editores' },
        journalist_paid_off: { desc: 'Pagaste y el silencio fue efectivo. El periodista desapareció del mapa. El equipo puede concentrarse. Pero el dinero salió del presupuesto y no hay vuelta atrás.', a: 'Usar la calma mediática para preparar al equipo', b: 'Invertir en scouting con lo que queda de presupuesto' },
      },
    },
    en: {
      title: '📖 The Journalist — Finale',
      variants: {
        journalist_backed_off: { desc: 'The journalist retreated. Surprise: he publishes a column titled "I Was Wrong About the Coach." He becomes your unexpected ally. Pressure drops dramatically.', a: 'Accept his apology publicly (media alliance)', b: 'Ignore his article and focus on football' },
        journalist_bribed: { desc: 'The bribe half-worked. He doesn\'t attack, but a colleague suspects. If the truth comes out, it\'s catastrophic.', a: 'Confess publicly and ask forgiveness (transparency)', b: 'Pay more to silence the second journalist' },
        journalist_published_lies: { desc: 'The lies multiplied. Three papers repeat the accusations. Your star player, targeted, threatens to leave. Darkest moment. But what if you fight back with truth?', a: '"ENOUGH! Here are the facts." (Full counterattack)', b: 'Negotiate quietly with the editors' },
        journalist_paid_off: { desc: 'You paid and the silence worked. The journalist vanished. Team can focus. But the money is gone.', a: 'Use the media calm to prepare the team', b: 'Invest remaining budget in scouting' },
      },
    },
    fr: {
      title: '📖 Le Journaliste — Dénouement',
      variants: {
        journalist_backed_off: { desc: 'Le journaliste s\'est retiré et publie une colonne : "Je me suis trompé sur le sélectionneur." Il devient votre allié.', a: 'Accepter ses excuses publiquement', b: 'Ignorer et se concentrer sur le football' },
        journalist_bribed: { desc: 'Le pot-de-vin a à moitié fonctionné. Un collègue soupçonne quelque chose.', a: 'Confesser publiquement', b: 'Payer plus pour le silence' },
        journalist_published_lies: { desc: 'Les mensonges se sont multipliés. Votre star menace de partir. Le moment le plus sombre.', a: '"ASSEZ ! Voici les faits."', b: 'Négocier en silence avec les rédacteurs' },
        journalist_paid_off: { desc: 'Vous avez payé et le silence a fonctionné. L\'équipe peut se concentrer.', a: 'Utiliser le calme médiatique pour préparer', b: 'Investir le budget restant en scouting' },
      },
    },
    de: {
      title: '📖 Der Journalist — Finale',
      variants: {
        journalist_backed_off: { desc: 'Der Journalist zog sich zurück und schrieb: "Ich lag falsch." Er wird dein unerwarteter Verbündeter.', a: 'Entschuldigung öffentlich annehmen', b: 'Ignorieren und auf Fußball fokussieren' },
        journalist_bribed: { desc: 'Die Bestechung funktionierte halb. Ein Kollege ist misstrauisch.', a: 'Öffentlich gestehen', b: 'Mehr zahlen für Stille' },
        journalist_published_lies: { desc: 'Die Lügen haben sich multipliziert. Dein Star droht zu gehen.', a: '"GENUG! Hier sind die Fakten."', b: 'Still mit den Redakteuren verhandeln' },
        journalist_paid_off: { desc: 'Du hast bezahlt und die Stille funktionierte. Das Team kann sich konzentrieren.', a: 'Die Medienruhe nutzen', b: 'Restbudget in Scouting investieren' },
      },
    },
    pt: {
      title: '📖 O Jornalista — Desfecho',
      variants: {
        journalist_backed_off: { desc: 'O jornalista recuou e publicou: "Enganei-me sobre o mister." Torna-se o seu aliado inesperado.', a: 'Aceitar as desculpas publicamente', b: 'Ignorar e focar no futebol' },
        journalist_bribed: { desc: 'O suborno funcionou a meias. Um colega suspeita.', a: 'Confessar publicamente', b: 'Pagar mais pelo silêncio' },
        journalist_published_lies: { desc: 'As mentiras multiplicaram-se. A sua estrela ameaça sair. O momento mais negro.', a: '"CHEGA! Aqui estão os factos."', b: 'Negociar em silêncio com os editores' },
        journalist_paid_off: { desc: 'Pagou e o silêncio funcionou. A equipa pode concentrar-se.', a: 'Usar a calma mediática para preparar', b: 'Investir o orçamento restante em scouting' },
      },
    },
    it: {
      title: '📖 Il Giornalista — Epilogo',
      variants: {
        journalist_backed_off: { desc: 'Il giornalista si è ritirato e ha scritto: "Mi sbagliavo sul mister." Diventa il tuo alleato inaspettato.', a: 'Accettare le scuse pubblicamente', b: 'Ignorare e concentrarsi sul calcio' },
        journalist_bribed: { desc: 'La tangente ha funzionato a metà. Un collega sospetta.', a: 'Confessare pubblicamente', b: 'Pagare di più per il silenzio' },
        journalist_published_lies: { desc: 'Le bugie si sono moltiplicate. La tua star minaccia di andarsene. Il momento più buio.', a: '"BASTA! Ecco i fatti."', b: 'Negoziare in silenzio con i direttori' },
        journalist_paid_off: { desc: 'Hai pagato e il silenzio ha funzionato. La squadra può concentrarsi.', a: 'Usare la calma mediatica per preparare', b: 'Investire il budget rimanente in scouting' },
      },
    },
  },

  // ════════════════════════════════════════════
  // C. "El Vestuario" (The Locker Room)
  // ════════════════════════════════════════════
  el_vestuario_1: {
    es: { title: '📖 El Vestuario', desc: 'Entras al vestuario y encuentras a {starPlayer} y al capitán en una discusión acalorada sobre la táctica. "¡Necesitamos jugar más directo!" grita uno. "¡Eso es fútbol de pueblo!" responde el otro. Los demás miran al suelo. Te miran a ti.', a: 'Apoyar al veterano capitán (orden y disciplina)', b: 'Mediar: "Los dos tenéis razón. Vamos a combinarlo"' },
    en: { title: '📖 The Locker Room', desc: 'You walk in and find {starPlayer} and the captain in a heated argument about tactics. "We need to play more direct!" shouts one. "That\'s Sunday league football!" replies the other. Everyone stares at the floor. Then at you.', a: 'Side with the veteran captain (order and discipline)', b: 'Mediate: "You\'re both right. Let\'s combine it"' },
    fr: { title: '📖 Le Vestiaire', desc: 'Vous entrez et trouvez {starPlayer} et le capitaine en pleine dispute sur la tactique.', a: 'Soutenir le capitaine vétéran', b: 'Médier : "Vous avez tous les deux raison"' },
    de: { title: '📖 Die Kabine', desc: 'Du betrittst die Kabine und findest {starPlayer} und den Kapitän in einem hitzigen Streit über die Taktik.', a: 'Den Veteran-Kapitän unterstützen', b: 'Vermitteln: "Ihr habt beide Recht"' },
    pt: { title: '📖 O Balneário', desc: 'Entra no balneário e encontra {starPlayer} e o capitão numa discussão acesa sobre a tática.', a: 'Apoiar o capitão veterano', b: 'Mediar: "Os dois têm razão"' },
    it: { title: '📖 Lo Spogliatoio', desc: 'Entri nello spogliatoio e trovi {starPlayer} e il capitano in una discussione accesa sulla tattica.', a: 'Sostenere il capitano veterano', b: 'Mediare: "Avete ragione entrambi"' },
  },

  el_vestuario_2: {
    es: { title: '📖 El Vestuario — Cap. 2', variants: {
      sided_with_veteran: { desc: 'Tu decisión de apoyar al veterano trajo orden. Pero el grupo joven está resentido. Susurran en los pasillos. El veterano te agradece, pero sientes la fractura. Antes del siguiente partido, tienes que elegir: ¿dejas que el veterano dé la charla o retomas el control?', a: 'El veterano da la charla (consolidar su liderazgo)', b: 'Tú das la charla: "Aquí mando yo" (retomar control)' },
      mediated_conflict: { desc: 'Tu mediación funcionó... de momento. Los dos aceptaron trabajar juntos, pero la tensión subyace. En el entrenamiento, un pase mal dado provoca miradas asesinas. ¿Refuerzas la unidad o dejas que se resuelva solo?', a: 'Actividad de equipo fuera del campo (unir al grupo)', b: 'Entrenar duro sin hablar del tema (dejar que se resuelva)' },
    }},
    en: { title: '📖 The Locker Room — Ch. 2', variants: {
      sided_with_veteran: { desc: 'Your decision to back the veteran brought order. But the young group is resentful. They whisper in the hallways. The veteran thanks you, but you feel the fracture. Before the next match: let the veteran give the talk or take back control?', a: 'Veteran gives the talk (consolidate his leadership)', b: 'You give the talk: "I\'m in charge here" (take back control)' },
      mediated_conflict: { desc: 'Your mediation worked... for now. They agreed to work together, but tension lingers. In training, a bad pass triggers death stares. Reinforce unity or let it resolve itself?', a: 'Team activity off the pitch (bond the group)', b: 'Train hard without addressing it (let it resolve)' },
    }},
    fr: { title: '📖 Le Vestiaire — Ch. 2', variants: {
      sided_with_veteran: { desc: 'Votre choix a amené l\'ordre, mais les jeunes sont rancuniers.', a: 'Le vétéran fait le discours', b: 'Vous faites le discours : "C\'est moi qui commande"' },
      mediated_conflict: { desc: 'Votre médiation a fonctionné... pour l\'instant. La tension persiste.', a: 'Activité d\'équipe hors terrain', b: 'S\'entraîner dur sans en parler' },
    }},
    de: { title: '📖 Die Kabine — Kap. 2', variants: {
      sided_with_veteran: { desc: 'Deine Entscheidung brachte Ordnung, aber die Jungen sind verärgert.', a: 'Der Veteran hält die Rede', b: 'Du hältst die Rede: "Hier bestimme ich"' },
      mediated_conflict: { desc: 'Deine Vermittlung funktionierte... vorerst. Die Spannung bleibt.', a: 'Teamaktivität abseits des Platzes', b: 'Hart trainieren ohne darüber zu reden' },
    }},
    pt: { title: '📖 O Balneário — Cap. 2', variants: {
      sided_with_veteran: { desc: 'A sua decisão trouxe ordem, mas os jovens estão ressentidos.', a: 'O veterano faz a palestra', b: 'O mister faz a palestra: "Aqui mando eu"' },
      mediated_conflict: { desc: 'A sua mediação funcionou... por agora. A tensão persiste.', a: 'Atividade de equipa fora do campo', b: 'Treinar duro sem falar no assunto' },
    }},
    it: { title: '📖 Lo Spogliatoio — Cap. 2', variants: {
      sided_with_veteran: { desc: 'La tua decisione ha portato ordine, ma i giovani sono risentiti.', a: 'Il veterano fa il discorso', b: 'Tu fai il discorso: "Qui comando io"' },
      mediated_conflict: { desc: 'La tua mediazione ha funzionato... per ora. La tensione rimane.', a: 'Attività di squadra fuori dal campo', b: 'Allenarsi duro senza affrontare il tema' },
    }},
  },

  el_vestuario_3: {
    es: { title: '📖 El Vestuario — Desenlace', variants: {
      veteran_leads: { desc: 'El veterano tomó las riendas. El vestuario es suyo. Los jugadores le siguen ciegamente. Antes del partido más grande, se gira hacia ti y dice: "Míster, lo que diga usted." La unidad es total. El equipo es una máquina.', a: '"Ganad por nosotros. Por todo." (Dejar que la emoción fluya)', b: '"Mismo plan de siempre. Sin sorpresas." (Mantener la frialdad)' },
      rebel_faction: { desc: 'La facción rebelde explotó. Tres jugadores exigen cambios o amenazan con hablar a la prensa. El vestuario está roto. Tienes que actuar YA o perderás el control.', a: 'Expulsar a los rebeldes (pérdida de jugadores)', b: 'Negociar: "¿Qué necesitáis para volver?"' },
      peace_holds: { desc: 'La paz se mantuvo. El vestuario está unido, no por amistad, sino por respeto mutuo. Es más que suficiente. Antes del gran partido, el silencio del vestuario dice más que mil palabras.', a: 'Romper el silencio con un discurso emotivo', b: 'Dejar que el silencio hable: "Vamos."' },
      peace_breaks: { desc: 'La paz se rompió. Lo que empezó como una mirada acabó en empujones. Ahora, antes del partido más importante, el vestuario parece un campo de batalla. Necesitas un milagro.', a: 'Gritar: "¡BASTA! ¡O estamos juntos o nos vamos a casa!" (Autoridad)', b: 'Hablar uno a uno con cada jugador implicado (Empatía)' },
    }},
    en: { title: '📖 The Locker Room — Finale', variants: {
      veteran_leads: { desc: 'The veteran took charge. The locker room is his. Players follow him blindly. Before the biggest match, he turns to you: "Coach, whatever you say." Total unity. The team is a machine.', a: '"Win for us. For everything." (Let emotion flow)', b: '"Same plan as always. No surprises." (Stay cold)' },
      rebel_faction: { desc: 'The rebel faction exploded. Three players demand changes or threaten to go to the press. Locker room is broken. Act NOW or lose control.', a: 'Expel the rebels (lose players)', b: 'Negotiate: "What do you need to come back?"' },
      peace_holds: { desc: 'Peace held. The locker room is united, not by friendship, but mutual respect. Before the big match, the silence says more than words.', a: 'Break the silence with an emotional speech', b: 'Let the silence speak: "Let\'s go."' },
      peace_breaks: { desc: 'Peace broke. What started as a look ended in shoving. Before the biggest match, the locker room feels like a battlefield. You need a miracle.', a: 'Shout: "ENOUGH! We\'re together or we go home!" (Authority)', b: 'Talk one-on-one with each player involved (Empathy)' },
    }},
    fr: { title: '📖 Le Vestiaire — Dénouement', variants: {
      veteran_leads: { desc: 'Le vétéran a pris les rênes. L\'unité est totale.', a: '"Gagnez pour nous. Pour tout."', b: '"Même plan que d\'habitude."' },
      rebel_faction: { desc: 'La faction rebelle a explosé. Trois joueurs exigent des changements.', a: 'Expulser les rebelles', b: 'Négocier' },
      peace_holds: { desc: 'La paix a tenu. Le vestiaire est uni par le respect mutuel.', a: 'Discours émouvant', b: 'Laisser le silence parler' },
      peace_breaks: { desc: 'La paix s\'est brisée. Le vestiaire est un champ de bataille.', a: '"ASSEZ ! Ensemble ou on rentre !"', b: 'Parler un à un avec chaque joueur' },
    }},
    de: { title: '📖 Die Kabine — Finale', variants: {
      veteran_leads: { desc: 'Der Veteran hat das Kommando übernommen. Totale Einheit.', a: '"Gewinnt für uns. Für alles."', b: '"Gleicher Plan wie immer."' },
      rebel_faction: { desc: 'Die Rebellenfraktion ist explodiert. Drei Spieler fordern Änderungen.', a: 'Die Rebellen ausschließen', b: 'Verhandeln' },
      peace_holds: { desc: 'Der Frieden hielt. Die Kabine ist durch gegenseitigen Respekt geeint.', a: 'Emotionale Rede', b: 'Die Stille sprechen lassen' },
      peace_breaks: { desc: 'Der Frieden zerbrach. Die Kabine fühlt sich wie ein Schlachtfeld an.', a: '"GENUG! Zusammen oder nach Hause!"', b: 'Einzelgespräche mit jedem Spieler' },
    }},
    pt: { title: '📖 O Balneário — Desfecho', variants: {
      veteran_leads: { desc: 'O veterano tomou as rédeas. A unidade é total.', a: '"Ganhem por nós. Por tudo."', b: '"Mesmo plano de sempre."' },
      rebel_faction: { desc: 'A facção rebelde explodiu. Três jogadores exigem mudanças.', a: 'Expulsar os rebeldes', b: 'Negociar' },
      peace_holds: { desc: 'A paz manteve-se. O balneário está unido pelo respeito mútuo.', a: 'Discurso emocionante', b: 'Deixar o silêncio falar' },
      peace_breaks: { desc: 'A paz quebrou-se. O balneário parece um campo de batalha.', a: '"CHEGA! Juntos ou vamos para casa!"', b: 'Falar um a um com cada jogador' },
    }},
    it: { title: '📖 Lo Spogliatoio — Epilogo', variants: {
      veteran_leads: { desc: 'Il veterano ha preso il comando. Unità totale.', a: '"Vincete per noi. Per tutto."', b: '"Stesso piano di sempre."' },
      rebel_faction: { desc: 'La fazione ribelle è esplosa. Tre giocatori chiedono cambiamenti.', a: 'Espellere i ribelli', b: 'Negoziare' },
      peace_holds: { desc: 'La pace ha retto. Lo spogliatoio è unito dal rispetto reciproco.', a: 'Discorso emozionante', b: 'Lasciare che il silenzio parli' },
      peace_breaks: { desc: 'La pace si è rotta. Lo spogliatoio sembra un campo di battaglia.', a: '"BASTA! Insieme o a casa!"', b: 'Parlare uno a uno con ogni giocatore' },
    }},
  },

  // ════════════════════════════════════════════
  // D. "El Prodigio" (The Prodigy)
  // ════════════════════════════════════════════
  el_prodigio_1: {
    es: { title: '📖 El Prodigio', desc: 'En el entrenamiento, un chaval de 19 años hace algo que no habías visto jamás. Un regate imposible, un pase de otro planeta. Los veteranos se miran entre ellos. Este chico tiene algo especial. Pero es su primera convocatoria y el próximo partido es decisivo.', a: 'Darle minutos: "Has demostrado que mereces jugar" (Alto riesgo/recompensa)', b: 'Protegerlo: "Tu momento llegará, pero no hoy" (Seguro)' },
    en: { title: '📖 The Prodigy', desc: 'During training, a 19-year-old does something you\'ve never seen. An impossible dribble, a pass from another planet. Veterans exchange looks. This kid has something special. But it\'s his first call-up and the next match is decisive.', a: 'Give him minutes: "You\'ve earned your chance" (High risk/reward)', b: 'Protect him: "Your time will come, but not today" (Safe)' },
    fr: { title: '📖 Le Prodige', desc: 'À l\'entraînement, un gamin de 19 ans fait quelque chose d\'incroyable. Un dribble impossible. Les vétérans échangent des regards. Ce gosse a quelque chose de spécial.', a: 'Lui donner du temps de jeu', b: 'Le protéger : "Ton moment viendra"' },
    de: { title: '📖 Das Wunderkind', desc: 'Im Training macht ein 19-Jähriger etwas Unglaubliches. Ein unmögliches Dribbling. Die Veteranen tauschen Blicke. Dieses Kind hat etwas Besonderes.', a: 'Ihm Spielzeit geben', b: 'Ihn schützen: "Deine Zeit wird kommen"' },
    pt: { title: '📖 O Prodígio', desc: 'No treino, um miúdo de 19 anos faz algo que nunca tinha visto. Um drible impossível. Os veteranos trocam olhares. Este rapaz tem algo especial.', a: 'Dar-lhe minutos: "Mereceste a tua oportunidade"', b: 'Protegê-lo: "O teu momento chegará"' },
    it: { title: '📖 Il Prodigio', desc: 'In allenamento, un ragazzo di 19 anni fa qualcosa di incredibile. Un dribbling impossibile. I veterani si scambiano sguardi. Questo ragazzo ha qualcosa di speciale.', a: 'Dargli minuti: "Ti sei guadagnato la chance"', b: 'Proteggerlo: "Il tuo momento arriverà"' },
  },

  el_prodigio_2: {
    es: { title: '📖 El Prodigio — Cap. 2', variants: {
      prodigy_given_chance: { desc: 'Le diste la oportunidad y el mundo se dividió. Los que dicen que fue brillante y los que dicen que casi nos cuesta el partido. La prensa lo llama "la apuesta del míster". El chaval, ajeno a todo, solo quiere volver a jugar.', a: 'Mantenerlo de titular: "Es nuestro arma secreta"', b: 'Bajarlo al banquillo: "Has demostrado, ahora observa"' },
      prodigy_protected: { desc: 'Lo protegiste y el chaval está hambriento. En cada entrenamiento es el mejor. Los compañeros lo apoyan. La prensa pregunta por él constantemente. "¿Cuándo juega el prodigio?" Es su momento...', a: 'Ahora sí: titular. "Ha llegado tu hora"', b: 'Seguir protegiéndolo: "Paciencia"' },
    }},
    en: { title: '📖 The Prodigy — Ch. 2', variants: {
      prodigy_given_chance: { desc: 'You gave him the chance and the world split. Some say he was brilliant, others say he nearly cost you the match. The press calls it "the coach\'s gamble." The kid just wants to play again.', a: 'Keep him starting: "He\'s our secret weapon"', b: 'Back to the bench: "You proved yourself, now observe"' },
      prodigy_protected: { desc: 'You protected him and the kid is hungry. Every training he\'s the best. Teammates support him. Press asks constantly: "When does the prodigy play?"', a: 'Now: start him. "Your time has come"', b: 'Keep protecting him: "Patience"' },
    }},
    fr: { title: '📖 Le Prodige — Ch. 2', variants: {
      prodigy_given_chance: { desc: 'Vous lui avez donné sa chance et le monde s\'est divisé.', a: 'Le garder titulaire', b: 'Le remettre sur le banc' },
      prodigy_protected: { desc: 'Vous l\'avez protégé et il est affamé. La presse demande constamment quand il jouera.', a: 'Le titulariser maintenant', b: 'Continuer à le protéger' },
    }},
    de: { title: '📖 Das Wunderkind — Kap. 2', variants: {
      prodigy_given_chance: { desc: 'Du hast ihm die Chance gegeben und die Welt war gespalten.', a: 'Ihn in der Startelf behalten', b: 'Zurück auf die Bank' },
      prodigy_protected: { desc: 'Du hast ihn geschützt und er ist hungrig. Die Presse fragt ständig.', a: 'Jetzt starten lassen', b: 'Weiter schützen' },
    }},
    pt: { title: '📖 O Prodígio — Cap. 2', variants: {
      prodigy_given_chance: { desc: 'Deu-lhe a oportunidade e o mundo dividiu-se.', a: 'Mantê-lo no onze', b: 'Voltar ao banco' },
      prodigy_protected: { desc: 'Protegeu-o e o miúdo está faminto. A imprensa pergunta constantemente.', a: 'Agora sim: titular', b: 'Continuar a protegê-lo' },
    }},
    it: { title: '📖 Il Prodigio — Cap. 2', variants: {
      prodigy_given_chance: { desc: 'Gli hai dato la chance e il mondo si è diviso.', a: 'Tenerlo titolare', b: 'Rimetterlo in panchina' },
      prodigy_protected: { desc: 'L\'hai protetto ed è affamato. La stampa chiede costantemente.', a: 'Adesso sì: titolare', b: 'Continuare a proteggerlo' },
    }},
  },

  el_prodigio_3: {
    es: { title: '📖 El Prodigio — Desenlace', variants: {
      prodigy_shines: { desc: 'El prodigio brilló. Su nombre está en todos los titulares. Los rivales le temen. Es tu creación, tu legado. Antes del partido decisivo, te mira y dice: "Todo lo que sé me lo enseñó usted, míster."', a: '"Sal ahí y cambia la historia." (Darle la responsabilidad total)', b: '"Haz lo tuyo, pero el equipo es primero." (Equilibrar)' },
      prodigy_struggles: { desc: 'El prodigio luchó pero no brilló. La presión pudo con él. Llora en el vestuario. Los medios dicen que "fue un error confiar en un niño". Pero tú ves algo en sus ojos: hambre. ¿Última oportunidad?', a: '"Esta es TU noche. Demuéstrales a todos." (Última fe)', b: '"Descansa. Volverás más fuerte en el próximo." (Realismo)' },
      prodigy_hungry: { desc: 'Lo mantuviste hambriento y ahora está listo. Cada entrenamiento superó al anterior. Los compañeros le piden que juegue. Los rivales no saben nada de él. Es tu arma secreta perfecta.', a: '"Sorpresa total: titular y con libertad creativa" (Arma secreta)', b: '"Entra en el segundo tiempo si lo necesitamos" (Plan B)' },
      prodigy_forgotten: { desc: 'El prodigio fue olvidado. Ni la prensa ni los compañeros mencionan su nombre. Pero tú sabes que tiene algo. En el momento más crítico, ¿le das una última oportunidad?', a: 'Última oportunidad: "Demuestra que me equivoqué al esperarte"', b: 'Dejarlo fuera: la experiencia importa más ahora' },
    }},
    en: { title: '📖 The Prodigy — Finale', variants: {
      prodigy_shines: { desc: 'The prodigy shone. His name is on every headline. Opponents fear him. He\'s your creation, your legacy. Before the decisive match, he looks at you: "Everything I know, you taught me, coach."', a: '"Go out and change history." (Full responsibility)', b: '"Do your thing, but team comes first." (Balance)' },
      prodigy_struggles: { desc: 'The prodigy struggled. Pressure got to him. He cries in the locker room. Media says trusting a kid was a mistake. But you see hunger in his eyes. One last chance?', a: '"This is YOUR night. Show them all." (Final faith)', b: '"Rest. You\'ll come back stronger next time." (Realism)' },
      prodigy_hungry: { desc: 'You kept him hungry and now he\'s ready. Every training session better than the last. Opponents know nothing about him. Your perfect secret weapon.', a: '"Total surprise: starter with creative freedom" (Secret weapon)', b: '"Come on in the second half if needed" (Plan B)' },
      prodigy_forgotten: { desc: 'The prodigy was forgotten. Neither press nor teammates mention his name. But you know he has something. At the most critical moment, one last chance?', a: 'Last chance: "Prove me wrong for waiting"', b: 'Leave him out: experience matters more now' },
    }},
    fr: { title: '📖 Le Prodige — Dénouement', variants: {
      prodigy_shines: { desc: 'Le prodige a brillé. Son nom est partout. Avant le match décisif, il vous regarde : "Tout ce que je sais, c\'est vous qui me l\'avez appris."', a: '"Va changer l\'histoire."', b: '"Fais ton truc, mais l\'équipe d\'abord."' },
      prodigy_struggles: { desc: 'Le prodige a souffert. La pression l\'a submergé. Mais vous voyez la faim dans ses yeux.', a: '"C\'est TA nuit. Montre-leur."', b: '"Repose-toi. Tu reviendras plus fort."' },
      prodigy_hungry: { desc: 'Vous l\'avez gardé affamé et il est prêt. Votre arme secrète parfaite.', a: '"Surprise totale : titulaire" ', b: '"En seconde mi-temps si nécessaire"' },
      prodigy_forgotten: { desc: 'Le prodige a été oublié. Une dernière chance ?', a: 'Dernière chance', b: 'Le laisser de côté' },
    }},
    de: { title: '📖 Das Wunderkind — Finale', variants: {
      prodigy_shines: { desc: 'Das Wunderkind strahlte. Sein Name ist überall. Vor dem entscheidenden Spiel sagt er: "Alles, was ich weiß, haben Sie mir beigebracht."', a: '"Geh raus und schreib Geschichte."', b: '"Mach dein Ding, aber Team geht vor."' },
      prodigy_struggles: { desc: 'Das Wunderkind kämpfte. Der Druck war zu viel. Aber du siehst Hunger in seinen Augen.', a: '"Das ist DEINE Nacht. Zeig es allen."', b: '"Ruh dich aus. Du kommst stärker zurück."' },
      prodigy_hungry: { desc: 'Du hast ihn hungrig gehalten und jetzt ist er bereit. Deine perfekte Geheimwaffe.', a: '"Totale Überraschung: Startelf"', b: '"In der zweiten Halbzeit falls nötig"' },
      prodigy_forgotten: { desc: 'Das Wunderkind wurde vergessen. Eine letzte Chance?', a: 'Letzte Chance', b: 'Draußen lassen' },
    }},
    pt: { title: '📖 O Prodígio — Desfecho', variants: {
      prodigy_shines: { desc: 'O prodígio brilhou. O seu nome está em todos os títulos. Antes do jogo decisivo, olha para si: "Tudo o que sei, foi o mister que me ensinou."', a: '"Sai e muda a história."', b: '"Faz o teu, mas a equipa vem primeiro."' },
      prodigy_struggles: { desc: 'O prodígio sofreu. A pressão venceu-o. Mas vê fome nos olhos dele.', a: '"Esta é A TUA noite. Mostra-lhes."', b: '"Descansa. Voltas mais forte."' },
      prodigy_hungry: { desc: 'Manteve-o com fome e agora está pronto. A sua arma secreta perfeita.', a: '"Surpresa total: titular"', b: '"Entra na segunda parte se precisarmos"' },
      prodigy_forgotten: { desc: 'O prodígio foi esquecido. Uma última oportunidade?', a: 'Última oportunidade', b: 'Deixá-lo de fora' },
    }},
    it: { title: '📖 Il Prodigio — Epilogo', variants: {
      prodigy_shines: { desc: 'Il prodigio ha brillato. Il suo nome è ovunque. Prima della partita decisiva ti guarda: "Tutto quello che so, me l\'ha insegnato lei, mister."', a: '"Vai e cambia la storia."', b: '"Fai il tuo, ma la squadra viene prima."' },
      prodigy_struggles: { desc: 'Il prodigio ha sofferto. La pressione l\'ha sopraffatto. Ma vedi fame nei suoi occhi.', a: '"Questa è LA TUA notte. Mostra a tutti."', b: '"Riposati. Tornerai più forte."' },
      prodigy_hungry: { desc: 'L\'hai tenuto affamato e ora è pronto. La tua arma segreta perfetta.', a: '"Sorpresa totale: titolare"', b: '"Entra nel secondo tempo se serve"' },
      prodigy_forgotten: { desc: 'Il prodigio è stato dimenticato. Un\'ultima possibilità?', a: 'Ultima possibilità', b: 'Lasciarlo fuori' },
    }},
  },

  // ════════════════════════════════════════════
  // E. "La Lesión" (The Injury)
  // ════════════════════════════════════════════
  la_lesion_1: {
    es: { title: '📖 La Lesión', desc: '{starPlayer} sale del entrenamiento cojeando. El médico te llama aparte: "Tiene una molestia en el isquiotibial. Si descansa 2 partidos, estará al 100%. Si juega mañana, hay un 35% de probabilidad de rotura muscular." La decisión es tuya.', a: 'Descansarlo: "Su salud es lo primero" (Sin estrella, pero seguro)', b: 'Arriesgar: "Lo necesitamos mañana" (Boost pero riesgo de lesión grave)' },
    en: { title: '📖 The Injury', desc: '{starPlayer} limps off training. The doctor pulls you aside: "Hamstring niggle. Two matches rest and he\'s 100%. Play him tomorrow and there\'s a 35% chance of a muscle tear." Your call.', a: 'Rest him: "Health comes first" (No star, but safe)', b: 'Risk it: "We need him tomorrow" (Boost but serious injury risk)' },
    fr: { title: '📖 La Blessure', desc: '{starPlayer} sort de l\'entraînement en boitant. Le médecin vous prend à part : "Gêne aux ischio-jambiers. Deux matchs de repos et il sera à 100%. S\'il joue demain, 35% de risque de déchirure."', a: 'Le reposer : "Sa santé d\'abord"', b: 'Risquer : "On a besoin de lui demain"' },
    de: { title: '📖 Die Verletzung', desc: '{starPlayer} humpelt vom Training. Der Arzt nimmt dich beiseite: "Probleme am Oberschenkel. Zwei Spiele Pause und er ist 100%. Spielt er morgen, 35% Risiko eines Muskelfaserrisses."', a: 'Schonen: "Gesundheit zuerst"', b: 'Riskieren: "Wir brauchen ihn morgen"' },
    pt: { title: '📖 A Lesão', desc: '{starPlayer} sai do treino a coxear. O médico chama-o à parte: "Desconforto nos isquiotibiais. Dois jogos de descanso e estará a 100%. Se jogar amanhã, 35% de risco de rotura muscular."', a: 'Descansá-lo: "A saúde vem primeiro"', b: 'Arriscar: "Precisamos dele amanhã"' },
    it: { title: '📖 L\'Infortunio', desc: '{starPlayer} esce dall\'allenamento zoppicando. Il medico ti prende da parte: "Fastidio ai flessori. Due partite di riposo e sarà al 100%. Se gioca domani, 35% di rischio di strappo muscolare."', a: 'Farlo riposare: "La salute viene prima"', b: 'Rischiare: "Ci serve domani"' },
  },

  la_lesion_2: {
    es: { title: '📖 La Lesión — Cap. 2', variants: {
      rested_star: { desc: 'Descansó y la recuperación va perfecta. {starPlayer} está impaciente, se le ve con hambre. El médico confirma: "Está listo. Al 100%." La pregunta ahora es: ¿vuelve directamente de titular o entra como revulsivo?', a: 'Titular desde el minuto 1 (vuelve a tope)', b: 'Entra en el segundo tiempo (gradual pero con coste)' },
      risked_star: { desc: 'Lo arriesgaste y las noticias no son buenas. El médico te mira con gravedad: "La molestia empeoró. Podemos tratarlo con antiinflamatorios, pero hay riesgo real de que se rompa si juega otro partido."', a: '"Tratamiento de urgencia, que juegue" (Alto riesgo)', b: '"Que descanse, no puedo perderlo para siempre" (Aceptar la pérdida)' },
    }},
    en: { title: '📖 The Injury — Ch. 2', variants: {
      rested_star: { desc: 'He rested and recovery went perfectly. {starPlayer} is impatient, hungry. Doctor confirms: "100% fit." The question: starter from minute one or impact sub?', a: 'Start from minute 1 (back at full strength)', b: 'Second-half sub (gradual but costly)' },
      risked_star: { desc: 'You risked it and the news isn\'t good. Doctor looks grave: "The niggle worsened. We can treat with anti-inflammatories, but real risk of a tear if he plays again."', a: '"Emergency treatment, let him play" (High risk)', b: '"Rest him, I can\'t lose him forever" (Accept the loss)' },
    }},
    fr: { title: '📖 La Blessure — Ch. 2', variants: {
      rested_star: { desc: 'Il s\'est reposé et la récupération est parfaite. {starPlayer} est impatient, affamé. Le médecin confirme : "100% prêt."', a: 'Titulaire dès la 1ère minute', b: 'Entrer en seconde mi-temps' },
      risked_star: { desc: 'Vous avez risqué et la gêne a empiré. Le médecin a l\'air grave.', a: '"Traitement d\'urgence, qu\'il joue"', b: '"Repos, je ne peux pas le perdre"' },
    }},
    de: { title: '📖 Die Verletzung — Kap. 2', variants: {
      rested_star: { desc: 'Er hat sich erholt. {starPlayer} ist ungeduldig. Der Arzt bestätigt: "100% fit."', a: 'Von Anfang an starten', b: 'In der zweiten Halbzeit einwechseln' },
      risked_star: { desc: 'Du hast riskiert und die Probleme sind schlimmer geworden. Der Arzt sieht ernst aus.', a: '"Notfallbehandlung, er spielt"', b: '"Pause, ich kann ihn nicht für immer verlieren"' },
    }},
    pt: { title: '📖 A Lesão — Cap. 2', variants: {
      rested_star: { desc: 'Descansou e a recuperação foi perfeita. {starPlayer} está impaciente, com fome. O médico confirma: "100% apto."', a: 'Titular desde o minuto 1', b: 'Entra na segunda parte' },
      risked_star: { desc: 'Arriscou e o desconforto piorou. O médico tem um ar grave.', a: '"Tratamento de urgência, que jogue"', b: '"Descanso, não posso perdê-lo para sempre"' },
    }},
    it: { title: '📖 L\'Infortunio — Cap. 2', variants: {
      rested_star: { desc: 'Ha riposato e il recupero è perfetto. {starPlayer} è impaziente, affamato. Il medico conferma: "100% pronto."', a: 'Titolare dal 1° minuto', b: 'Entra nel secondo tempo' },
      risked_star: { desc: 'Hai rischiato e il fastidio è peggiorato. Il medico ha un\'aria grave.', a: '"Trattamento d\'emergenza, che giochi"', b: '"Riposo, non posso perderlo per sempre"' },
    }},
  },

  la_lesion_3: {
    es: { title: '📖 La Lesión — Desenlace', variants: {
      star_recovered_fully: { desc: '{starPlayer} está al 100%. Mejor que nunca. En el calentamiento se le ve brillar. Los compañeros lo miran con admiración. El rival lo teme. Tu paciencia dio frutos. Es el momento de la verdad.', a: '"Eres el mejor del mundo. Demuéstralo HOY." (Motivar al máximo)', b: '"Haz tu trabajo como siempre. Nada especial." (Sin presión)' },
      star_treatment_costly: { desc: 'El tratamiento fue caro pero funcionó. {starPlayer} está al 80%. No es ideal, pero puede jugar. El equipo le necesita. La pregunta es cuánto le exiges.', a: '"Te necesito 90 minutos. Aguanta." (Exprimirlo)', b: '"Juega 60 y descansa. Tenemos banquillo." (Gestionar)' },
      star_injury_worsened: { desc: '{starPlayer} está fuera. La lesión empeoró como temías. El vestuario está devastado. Pero tú ves una oportunidad: un equipo que lucha por su estrella ausente puede ser más peligroso. ¿O el vacío es demasiado grande?', a: '"¡Jugamos por él! ¡Que nuestro esfuerzo sea su medicina!" (Motivar)', b: '"Olvidemos nombres. Somos un equipo." (Pragmatismo)' },
      star_survives_risk: { desc: '{starPlayer} sobrevivió al riesgo. Está tocado pero jugable. Un 70% de su nivel. La prensa lo llama "el guerrero". El equipo lo ve como ejemplo de sacrificio. ¿Cuánto más puedes pedirle?', a: '"Una batalla más, campeón. La última." (Todo por el equipo)', b: '"Has dado todo. Ahora, cuídate." (Preservar)' },
    }},
    en: { title: '📖 The Injury — Finale', variants: {
      star_recovered_fully: { desc: '{starPlayer} is 100%. Better than ever. In warmup he shines. Teammates admire him. The opponent fears him. Your patience paid off. Moment of truth.', a: '"You\'re the best in the world. Prove it TODAY." (Maximum motivation)', b: '"Do your job as always. Nothing special." (No pressure)' },
      star_treatment_costly: { desc: 'Treatment was expensive but worked. {starPlayer} is at 80%. Not ideal, but can play.', a: '"I need you for 90 minutes. Hang in there." (Push him)', b: '"Play 60 and rest. We have a bench." (Manage)' },
      star_injury_worsened: { desc: '{starPlayer} is out. The injury worsened as feared. The locker room is devastated. But a team fighting for their absent star could be more dangerous.', a: '"We play for HIM! Let our effort be his medicine!" (Motivate)', b: '"Forget names. We are a team." (Pragmatism)' },
      star_survives_risk: { desc: '{starPlayer} survived the risk. Hurt but playable. 70% of his level. Press calls him "the warrior." How much more can you ask?', a: '"One more battle, champion. The last one." (All for the team)', b: '"You\'ve given everything. Take care now." (Preserve)' },
    }},
    fr: { title: '📖 La Blessure — Dénouement', variants: {
      star_recovered_fully: { desc: '{starPlayer} est à 100%. Mieux que jamais. Votre patience a payé.', a: '"Tu es le meilleur du monde. Prouve-le AUJOURD\'HUI."', b: '"Fais ton travail comme d\'habitude."' },
      star_treatment_costly: { desc: 'Le traitement a coûté cher mais {starPlayer} est à 80%.', a: '"J\'ai besoin de toi 90 minutes."', b: '"Joue 60 et repose-toi."' },
      star_injury_worsened: { desc: '{starPlayer} est forfait. Le vestiaire est dévasté.', a: '"On joue pour LUI !"', b: '"Oublions les noms. On est une équipe."' },
      star_survives_risk: { desc: '{starPlayer} a survécu au risque. Touché mais jouable. 70% de son niveau.', a: '"Une bataille de plus, champion."', b: '"Tu as tout donné. Prends soin de toi."' },
    }},
    de: { title: '📖 Die Verletzung — Finale', variants: {
      star_recovered_fully: { desc: '{starPlayer} ist 100% fit. Besser denn je. Deine Geduld hat sich ausgezahlt.', a: '"Du bist der Beste der Welt. Beweise es HEUTE."', b: '"Mach deinen Job wie immer."' },
      star_treatment_costly: { desc: 'Die Behandlung war teuer aber {starPlayer} ist bei 80%.', a: '"Ich brauche dich 90 Minuten."', b: '"Spiel 60 und ruh dich aus."' },
      star_injury_worsened: { desc: '{starPlayer} fällt aus. Die Kabine ist am Boden.', a: '"Wir spielen für IHN!"', b: '"Vergessen wir Namen. Wir sind ein Team."' },
      star_survives_risk: { desc: '{starPlayer} überlebte das Risiko. Angeschlagen aber spielfähig.', a: '"Noch eine Schlacht, Champion."', b: '"Du hast alles gegeben. Schone dich."' },
    }},
    pt: { title: '📖 A Lesão — Desfecho', variants: {
      star_recovered_fully: { desc: '{starPlayer} está a 100%. Melhor do que nunca. A sua paciência valeu a pena.', a: '"És o melhor do mundo. Prova-o HOJE."', b: '"Faz o teu trabalho como sempre."' },
      star_treatment_costly: { desc: 'O tratamento foi caro mas {starPlayer} está a 80%.', a: '"Preciso de ti 90 minutos."', b: '"Joga 60 e descansa."' },
      star_injury_worsened: { desc: '{starPlayer} está fora. O balneário está devastado.', a: '"Jogamos por ELE!"', b: '"Esqueçam nomes. Somos uma equipa."' },
      star_survives_risk: { desc: '{starPlayer} sobreviveu ao risco. Tocado mas jogável. 70% do seu nível.', a: '"Mais uma batalha, campeão."', b: '"Deste tudo. Cuida-te agora."' },
    }},
    it: { title: '📖 L\'Infortunio — Epilogo', variants: {
      star_recovered_fully: { desc: '{starPlayer} è al 100%. Meglio che mai. La tua pazienza ha dato frutti.', a: '"Sei il migliore al mondo. Dimostralo OGGI."', b: '"Fai il tuo lavoro come sempre."' },
      star_treatment_costly: { desc: 'Il trattamento è costato caro ma {starPlayer} è all\'80%.', a: '"Ho bisogno di te per 90 minuti."', b: '"Gioca 60 e riposa."' },
      star_injury_worsened: { desc: '{starPlayer} è fuori. Lo spogliatoio è devastato.', a: '"Giochiamo per LUI!"', b: '"Dimentichiamo i nomi. Siamo una squadra."' },
      star_survives_risk: { desc: '{starPlayer} è sopravvissuto al rischio. Acciaccato ma giocabile.', a: '"Un\'altra battaglia, campione."', b: '"Hai dato tutto. Prenditi cura di te."' },
    }},
  },

  // ════════════════════════════════════════════
  // F. "El Soborno" (The Bribe)
  // ════════════════════════════════════════════
  el_soborno_1: {
    es: { title: '📖 El Soborno', desc: 'Noche antes del partido. Suena tu teléfono. Número desconocido. "Míster, tenemos amigos en la organización. El árbitro de mañana puede ser... flexible. Solo necesitamos que coopere." Una suma obscena aparece en pantalla. Nadie lo sabrá. ¿O sí?', a: 'Aceptar: "Dime qué necesitas." (Dinero + bonus, pero corrupción)', b: '"No me vuelvas a llamar." (Rechazar con convicción)' },
    en: { title: '📖 The Bribe', desc: 'Night before the match. Phone rings. Unknown number. "Coach, we have friends in the organization. Tomorrow\'s referee can be... flexible. We just need your cooperation." An obscene sum appears on screen. Nobody will know. Or will they?', a: 'Accept: "Tell me what you need." (Money + bonus, but corruption)', b: '"Don\'t ever call me again." (Refuse with conviction)' },
    fr: { title: '📖 Le Pot-de-vin', desc: 'La veille du match. Votre téléphone sonne. Numéro inconnu. "Sélectionneur, l\'arbitre de demain peut être... flexible. On a juste besoin de votre coopération."', a: 'Accepter : "Dites-moi ce qu\'il faut."', b: '"Ne me rappelez jamais."' },
    de: { title: '📖 Die Bestechung', desc: 'Nacht vor dem Spiel. Dein Telefon klingelt. Unbekannte Nummer. "Trainer, der Schiedsrichter morgen kann... flexibel sein. Wir brauchen nur Ihre Kooperation."', a: 'Annehmen: "Sagen Sie mir, was nötig ist."', b: '"Rufen Sie mich nie wieder an."' },
    pt: { title: '📖 O Suborno', desc: 'Noite antes do jogo. O telefone toca. Número desconhecido. "Mister, temos amigos na organização. O árbitro de amanhã pode ser... flexível. Só precisamos da sua cooperação."', a: 'Aceitar: "Diga-me o que precisa."', b: '"Nunca mais me ligue."' },
    it: { title: '📖 La Tangente', desc: 'La notte prima della partita. Squilla il telefono. Numero sconosciuto. "Mister, abbiamo amici nell\'organizzazione. L\'arbitro di domani può essere... flessibile."', a: 'Accettare: "Dimmi cosa serve."', b: '"Non mi chiami mai più."' },
  },

  el_soborno_2: {
    es: { title: '📖 El Soborno — Cap. 2', variants: {
      accepted_bribe: { desc: 'Aceptaste. El árbitro fue "generoso". Ganaste, pero en tu interior algo se rompió. Ahora llega un mensaje: "La FIFA abrió una investigación sobre irregularidades arbitrales." Tu nombre no sale... aún. ¿Borras pruebas o confiesas?', a: 'Borrar todo rastro y negar (alto riesgo)', b: 'Pagar más dinero para que el contacto desaparezca' },
      refused_bribe: { desc: 'Rechazaste con contundencia. Al día siguiente, anónimamente, filtras la llamada a la FIFA. La investigación se abre. Los medios te llaman "el íntegro". Tu equipo te respeta más que nunca. Pero el contacto sabe quién habló...', a: 'Declarar públicamente y pedir protección', b: 'Mantener el anonimato y seguir adelante' },
    }},
    en: { title: '📖 The Bribe — Ch. 2', variants: {
      accepted_bribe: { desc: 'You accepted. The referee was "generous." You won, but something broke inside. Now a message: "FIFA opened an investigation into refereeing irregularities." Your name isn\'t out... yet. Delete evidence or confess?', a: 'Delete all traces and deny (high risk)', b: 'Pay more to make the contact disappear' },
      refused_bribe: { desc: 'You refused firmly. Next day, you anonymously tip off FIFA. Investigation opens. Media calls you "the man of integrity." Team respects you more than ever. But the contact knows who talked...', a: 'Go public and request protection', b: 'Stay anonymous and move forward' },
    }},
    fr: { title: '📖 Le Pot-de-vin — Ch. 2', variants: {
      accepted_bribe: { desc: 'Vous avez accepté. L\'arbitre a été "généreux." Mais la FIFA ouvre une enquête.', a: 'Tout effacer et nier', b: 'Payer plus pour que le contact disparaisse' },
      refused_bribe: { desc: 'Vous avez refusé et anonymement alerté la FIFA. Vous êtes "l\'intègre."', a: 'Déclarer publiquement', b: 'Rester anonyme' },
    }},
    de: { title: '📖 Die Bestechung — Kap. 2', variants: {
      accepted_bribe: { desc: 'Du hast angenommen. Der Schiedsrichter war "großzügig." Aber die FIFA ermittelt.', a: 'Alle Spuren löschen und leugnen', b: 'Mehr zahlen damit der Kontakt verschwindet' },
      refused_bribe: { desc: 'Du hast abgelehnt und anonym die FIFA informiert. Du bist "der Integre."', a: 'Öffentlich erklären', b: 'Anonym bleiben' },
    }},
    pt: { title: '📖 O Suborno — Cap. 2', variants: {
      accepted_bribe: { desc: 'Aceitou. O árbitro foi "generoso." Mas a FIFA abriu uma investigação.', a: 'Apagar todos os vestígios e negar', b: 'Pagar mais para o contacto desaparecer' },
      refused_bribe: { desc: 'Recusou e anonimamente alertou a FIFA. É "o íntegro."', a: 'Declarar publicamente', b: 'Manter o anonimato' },
    }},
    it: { title: '📖 La Tangente — Cap. 2', variants: {
      accepted_bribe: { desc: 'Hai accettato. L\'arbitro è stato "generoso." Ma la FIFA apre un\'indagine.', a: 'Cancellare tutte le tracce e negare', b: 'Pagare di più per far sparire il contatto' },
      refused_bribe: { desc: 'Hai rifiutato e anonimamente hai allertato la FIFA. Sei "l\'integro."', a: 'Dichiarare pubblicamente', b: 'Restare anonimo' },
    }},
  },

  el_soborno_3: {
    es: { title: '📖 El Soborno — Desenlace', variants: {
      bribe_investigated: { desc: 'La investigación avanza. Hay rumores de que tu nombre apareció en documentos. La presión es insoportable. Un jugador pregunta en privado: "Míster, ¿es verdad?" Tu respuesta marcará todo.', a: '"Cometí un error. Pero no voy a huir." (Afrontar)', b: '"No sé de qué me hablas. Concéntrate en jugar." (Negar)' },
      bribe_covered_up: { desc: 'El soborno está enterrado. Pagaste y el contacto desapareció. Pero vives con la sombra. Cada vez que el árbitro pita a favor, te preguntas si es real. El equipo no sabe nada. ¿Dejas que el secreto muera o confiesas?', a: 'Dejarlo enterrado para siempre (vivir con ello)', b: 'Confesar al capitán: "Necesito que alguien lo sepa"' },
      bribe_hero: { desc: '¡Héroe! La FIFA te felicitó públicamente. Tu integridad es ejemplo mundial. Los sponsors llaman. Los medios te adoran. Pero lo más importante: tu equipo sabe que su míster es un hombre de principios. Llegáis al gran partido con la conciencia limpia.', a: '"Ganar limpio vale más que cualquier trofeo." (Discurso ético)', b: '"Ya basta de hablar de esto. A jugar." (Pragmatismo)' },
      bribe_silent_hero: { desc: 'Nadie sabe que fuiste tú quien alertó a la FIFA. El caso se cerró, tres oficiales fueron suspendidos. Tú sigues en la sombra, como siempre. Pero algo cambió dentro de ti: sabes que hiciste lo correcto.', a: 'Seguir en silencio: la virtud no necesita aplausos', b: 'Revelar la verdad: "Fui yo. Y lo haría otra vez."' },
    }},
    en: { title: '📖 The Bribe — Finale', variants: {
      bribe_investigated: { desc: 'Investigation advances. Rumors your name appeared in documents. A player asks privately: "Coach, is it true?" Your answer will mark everything.', a: '"I made a mistake. But I won\'t run." (Face it)', b: '"I don\'t know what you\'re talking about. Focus on playing." (Deny)' },
      bribe_covered_up: { desc: 'The bribe is buried. You paid and the contact vanished. But you live with the shadow. Every favorable call makes you wonder. Let the secret die or confess?', a: 'Bury it forever (live with it)', b: 'Confess to the captain: "I need someone to know"' },
      bribe_hero: { desc: 'Hero! FIFA publicly praised you. Your integrity is a global example. Sponsors call. Media adores you. Most importantly: your team knows their coach is principled.', a: '"Winning clean is worth more than any trophy." (Ethical speech)', b: '"Enough talk. Let\'s play." (Pragmatism)' },
      bribe_silent_hero: { desc: 'Nobody knows you tipped FIFA. Three officials suspended. You stay in the shadows. But something changed: you know you did the right thing.', a: 'Stay silent: virtue needs no applause', b: 'Reveal the truth: "It was me. And I\'d do it again."' },
    }},
    fr: { title: '📖 Le Pot-de-vin — Dénouement', variants: {
      bribe_investigated: { desc: 'L\'enquête avance. Des rumeurs que votre nom apparaît dans des documents.', a: '"J\'ai fait une erreur. Mais je ne fuirai pas."', b: '"Je ne sais pas de quoi vous parlez."' },
      bribe_covered_up: { desc: 'Le pot-de-vin est enterré. Mais vous vivez avec l\'ombre.', a: 'L\'enterrer pour toujours', b: 'Confesser au capitaine' },
      bribe_hero: { desc: 'Héros ! La FIFA vous a félicité. Votre intégrité est un exemple mondial.', a: '"Gagner proprement vaut plus qu\'un trophée."', b: '"Assez parlé. Jouons."' },
      bribe_silent_hero: { desc: 'Personne ne sait que c\'était vous. Trois officiels suspendus.', a: 'Rester silencieux', b: 'Révéler la vérité' },
    }},
    de: { title: '📖 Die Bestechung — Finale', variants: {
      bribe_investigated: { desc: 'Die Ermittlungen schreiten voran. Gerüchte, dass dein Name in Dokumenten auftaucht.', a: '"Ich habe einen Fehler gemacht. Aber ich werde nicht fliehen."', b: '"Ich weiß nicht, wovon du redest."' },
      bribe_covered_up: { desc: 'Die Bestechung ist begraben. Aber du lebst mit dem Schatten.', a: 'Für immer begraben', b: 'Dem Kapitän gestehen' },
      bribe_hero: { desc: 'Held! Die FIFA hat dich öffentlich gelobt. Deine Integrität ist ein globales Beispiel.', a: '"Sauber gewinnen ist mehr wert als jede Trophäe."', b: '"Genug geredet. Spielen wir."' },
      bribe_silent_hero: { desc: 'Niemand weiß, dass du es warst. Drei Offizielle suspendiert.', a: 'Still bleiben', b: 'Die Wahrheit enthüllen' },
    }},
    pt: { title: '📖 O Suborno — Desfecho', variants: {
      bribe_investigated: { desc: 'A investigação avança. Rumores de que o seu nome aparece em documentos.', a: '"Cometi um erro. Mas não vou fugir."', b: '"Não sei do que fala. Concentre-se em jogar."' },
      bribe_covered_up: { desc: 'O suborno está enterrado. Mas vive com a sombra.', a: 'Enterrar para sempre', b: 'Confessar ao capitão' },
      bribe_hero: { desc: 'Herói! A FIFA elogiou-o publicamente. A sua integridade é exemplo mundial.', a: '"Ganhar limpo vale mais que qualquer troféu."', b: '"Chega de falar. Vamos jogar."' },
      bribe_silent_hero: { desc: 'Ninguém sabe que foi o senhor. Três oficiais suspensos.', a: 'Manter o silêncio', b: 'Revelar a verdade' },
    }},
    it: { title: '📖 La Tangente — Epilogo', variants: {
      bribe_investigated: { desc: 'L\'indagine avanza. Voci che il tuo nome appare nei documenti.', a: '"Ho fatto un errore. Ma non scapperò."', b: '"Non so di cosa parli. Concentrati a giocare."' },
      bribe_covered_up: { desc: 'La tangente è sepolta. Ma vivi con l\'ombra.', a: 'Seppellirla per sempre', b: 'Confessare al capitano' },
      bribe_hero: { desc: 'Eroe! La FIFA ti ha elogiato pubblicamente. La tua integrità è un esempio mondiale.', a: '"Vincere pulito vale più di qualsiasi trofeo."', b: '"Basta parlare. Giochiamo."' },
      bribe_silent_hero: { desc: 'Nessuno sa che eri tu. Tre ufficiali sospesi.', a: 'Restare in silenzio', b: 'Rivelare la verità' },
    }},
  },

  // ════════════════════════════════════════════
  // G. "La Rivalidad" (The Rivalry)
  // ════════════════════════════════════════════
  la_rivalidad_1: {
    es: { title: '📖 La Rivalidad', desc: 'El seleccionador rival más famoso del torneo te señala en una rueda de prensa: "Su equipo no tiene nivel para llegar lejos. Lo digo con todo el respeto." Los periodistas se vuelven hacia ti como buitres esperando carroña. El mundo quiere drama.', a: '"Nos veremos en el campo. Y ahí no hay respeto." (Responder fuerte)', b: 'Sonreír en silencio y marcharte (Clase total)' },
    en: { title: '📖 The Rivalry', desc: 'The tournament\'s most famous rival coach points at you in a press conference: "Your team doesn\'t have the level to go far. I say this with all respect." Journalists turn to you like vultures. The world wants drama.', a: '"We\'ll see each other on the pitch. No respect there." (Fire back)', b: 'Smile silently and walk away (Pure class)' },
    fr: { title: '📖 La Rivalité', desc: 'Le sélectionneur rival le plus célèbre du tournoi vous pointe : "Votre équipe n\'a pas le niveau."', a: '"On se verra sur le terrain."', b: 'Sourire en silence et partir' },
    de: { title: '📖 Die Rivalität', desc: 'Der berühmteste Rivalentrainer zeigt auf dich: "Ihr Team hat nicht das Niveau."', a: '"Wir sehen uns auf dem Platz."', b: 'Still lächeln und gehen' },
    pt: { title: '📖 A Rivalidade', desc: 'O selecionador rival mais famoso aponta-o: "A sua equipa não tem nível para ir longe."', a: '"Vemo-nos no campo."', b: 'Sorrir em silêncio e sair' },
    it: { title: '📖 La Rivalità', desc: 'Il CT rivale più famoso ti punta: "La vostra squadra non ha il livello per andare lontano."', a: '"Ci vediamo in campo."', b: 'Sorridere in silenzio e andarsene' },
  },

  la_rivalidad_2: {
    es: { title: '📖 La Rivalidad — Cap. 2', variants: {
      responded_to_rival: { desc: 'Tu respuesta incendió las redes. Memes, hashtags, portadas. La guerra está declarada. El rival contraatacó: "Parece que le toqué la fibra." Tus jugadores están motivados, pero la presión se multiplica. ¿Sigues alimentando el fuego?', a: '"Esto termina cuando uno de los dos se vaya a casa." (Escalar)', b: '"Ya dije lo que tenía que decir. Ahora, a jugar." (Enfriar)' },
      ignored_rival: { desc: 'Tu silencio desconcertó a todos. El rival esperaba batalla y se encontró con un muro. Los medios te respetan, pero el rival sigue provocando. En el sorteo, os cruzáis por el pasillo. Te ofrece la mano con una sonrisa burlona.', a: 'Darle la mano y susurrar: "Nos vemos pronto." (Respeto con amenaza)', b: 'Ignorarlo completamente y pasar de largo (Indiferencia total)' },
    }},
    en: { title: '📖 The Rivalry — Ch. 2', variants: {
      responded_to_rival: { desc: 'Your response set the internet on fire. Memes, hashtags, front pages. War declared. The rival countered: "Seems I touched a nerve." Players are motivated but pressure multiplies. Keep feeding the fire?', a: '"This ends when one of us goes home." (Escalate)', b: '"I said what I had to say. Now, let\'s play." (Cool down)' },
      ignored_rival: { desc: 'Your silence baffled everyone. The rival expected a fight and met a wall. Media respects you, but the rival keeps provoking. In the draw, you cross paths. He offers a mocking handshake.', a: 'Shake his hand and whisper: "See you soon." (Respect with threat)', b: 'Completely ignore him and walk past (Total indifference)' },
    }},
    fr: { title: '📖 La Rivalité — Ch. 2', variants: {
      responded_to_rival: { desc: 'Votre réponse a enflammé les réseaux. La guerre est déclarée.', a: '"Ça finit quand l\'un de nous rentre."', b: '"J\'ai dit ce que j\'avais à dire."' },
      ignored_rival: { desc: 'Votre silence a déconcerté tout le monde. Mais le rival continue de provoquer.', a: 'Serrer sa main et chuchoter : "À bientôt."', b: 'L\'ignorer complètement' },
    }},
    de: { title: '📖 Die Rivalität — Kap. 2', variants: {
      responded_to_rival: { desc: 'Deine Antwort hat das Internet angezündet. Der Krieg ist erklärt.', a: '"Das endet wenn einer nach Hause fährt."', b: '"Ich habe gesagt was ich sagen musste."' },
      ignored_rival: { desc: 'Dein Schweigen verwirrte alle. Aber der Rivale provoziert weiter.', a: 'Hand geben und flüstern: "Bis bald."', b: 'Ihn komplett ignorieren' },
    }},
    pt: { title: '📖 A Rivalidade — Cap. 2', variants: {
      responded_to_rival: { desc: 'A sua resposta incendiou as redes. A guerra está declarada.', a: '"Isto acaba quando um de nós for para casa."', b: '"Já disse o que tinha a dizer."' },
      ignored_rival: { desc: 'O seu silêncio desconcertou todos. Mas o rival continua a provocar.', a: 'Apertar-lhe a mão e sussurrar: "Até breve."', b: 'Ignorá-lo completamente' },
    }},
    it: { title: '📖 La Rivalità — Cap. 2', variants: {
      responded_to_rival: { desc: 'La tua risposta ha incendiato i social. La guerra è dichiarata.', a: '"Finisce quando uno di noi torna a casa."', b: '"Ho detto quello che dovevo dire."' },
      ignored_rival: { desc: 'Il tuo silenzio ha spiazzato tutti. Ma il rivale continua a provocare.', a: 'Stringergli la mano e sussurrare: "Ci vediamo presto."', b: 'Ignorarlo completamente' },
    }},
  },

  la_rivalidad_3: {
    es: { title: '📖 La Rivalidad — Desenlace', variants: {
      rivalry_war: { desc: 'La guerra total. Los medios de todo el mundo siguen vuestra rivalidad más que los partidos. Si os enfrentáis, será el partido del siglo. Si no, la guerra seguirá en la sombra. Antes del gran partido, el rival manda un mensaje: "Que gane el mejor."', a: '"El mejor ya lo sabemos todos." (Arrogancia final)', b: '"Que gane el mejor. Sin rencor." (Respeto final)' },
      rivalry_cooled: { desc: 'La rivalidad se enfrió. Lo que prometía ser la guerra del siglo se convirtió en profesionalismo. Los medios están decepcionados pero tu equipo está centrado. A veces el mejor drama es no tener drama.', a: 'Aprovechar la calma para preparar al equipo a la perfección', b: 'Encender una última chispa: "Ahora sí, va por ellos"' },
      rival_respected_silence: { desc: 'Tu silencio se convirtió en leyenda. "El hombre que no cayó en la trampa." El rival, al no poder provocarte, perdió su ventaja psicológica. Tu equipo juega sin presión externa. El fútbol habla.', a: '"Nuestro silencio es nuestra fuerza. Sigamos así." (Mantener)', b: '"Ya no necesitamos silencio. ¡A ganar!" (Liberar la energía)' },
      rival_sees_weakness: { desc: 'El rival interpretó tu silencio como debilidad y atacó más fuerte. Sus jugadores están motivados contra vosotros. Los medios dicen que "os tienen miedo." Tu equipo necesita una reacción.', a: '"¡Se acabó el silencio! ¡Ahora vamos a hablar en el campo!" (Explotar)', b: '"Que piensen lo que quieran. Nosotros sabemos la verdad." (Resistir)' },
    }},
    en: { title: '📖 The Rivalry — Finale', variants: {
      rivalry_war: { desc: 'Total war. Media worldwide follows your rivalry more than the matches. Before the big game, the rival sends a message: "May the best team win."', a: '"We all know who the best is." (Final arrogance)', b: '"May the best team win. No hard feelings." (Final respect)' },
      rivalry_cooled: { desc: 'The rivalry cooled. What promised to be the war of the century became professionalism. Media is disappointed but your team is focused.', a: 'Use the calm to prepare the team perfectly', b: 'Light one last spark: "Now, it\'s for them"' },
      rival_respected_silence: { desc: 'Your silence became legend. "The man who didn\'t take the bait." The rival lost his psychological edge. Your team plays free.', a: '"Our silence is our strength. Let\'s keep it." (Maintain)', b: '"We don\'t need silence anymore. Let\'s WIN!" (Release energy)' },
      rival_sees_weakness: { desc: 'The rival read your silence as weakness and attacked harder. Their players are motivated against you. Media says "they fear you." Team needs a reaction.', a: '"Silence is OVER! Now we talk on the pitch!" (Explode)', b: '"Let them think what they want. We know the truth." (Resist)' },
    }},
    fr: { title: '📖 La Rivalité — Dénouement', variants: {
      rivalry_war: { desc: 'Guerre totale. Le rival envoie un message : "Que le meilleur gagne."', a: '"On sait tous qui est le meilleur."', b: '"Que le meilleur gagne. Sans rancune."' },
      rivalry_cooled: { desc: 'La rivalité s\'est refroidie. Votre équipe est concentrée.', a: 'Utiliser le calme pour préparer', b: 'Allumer une dernière étincelle' },
      rival_respected_silence: { desc: 'Votre silence est devenu légende. Le rival a perdu son avantage.', a: '"Notre silence est notre force."', b: '"Plus besoin de silence. GAGNONS !"' },
      rival_sees_weakness: { desc: 'Le rival a interprété votre silence comme de la faiblesse.', a: '"Le silence est FINI !"', b: '"Qu\'ils pensent ce qu\'ils veulent."' },
    }},
    de: { title: '📖 Die Rivalität — Finale', variants: {
      rivalry_war: { desc: 'Totaler Krieg. Der Rivale schickt eine Nachricht: "Möge der Bessere gewinnen."', a: '"Wir wissen alle, wer der Beste ist."', b: '"Möge der Bessere gewinnen. Ohne Groll."' },
      rivalry_cooled: { desc: 'Die Rivalität kühlte ab. Dein Team ist fokussiert.', a: 'Die Ruhe nutzen', b: 'Einen letzten Funken zünden' },
      rival_respected_silence: { desc: 'Dein Schweigen wurde zur Legende.', a: '"Unser Schweigen ist unsere Stärke."', b: '"Kein Schweigen mehr. GEWINNEN!"' },
      rival_sees_weakness: { desc: 'Der Rivale las dein Schweigen als Schwäche.', a: '"Schluss mit Schweigen!"', b: '"Sollen sie denken was sie wollen."' },
    }},
    pt: { title: '📖 A Rivalidade — Desfecho', variants: {
      rivalry_war: { desc: 'Guerra total. O rival manda mensagem: "Que ganhe o melhor."', a: '"Todos sabemos quem é o melhor."', b: '"Que ganhe o melhor. Sem ressentimentos."' },
      rivalry_cooled: { desc: 'A rivalidade arrefeceu. A equipa está focada.', a: 'Usar a calma para preparar', b: 'Acender uma última faísca' },
      rival_respected_silence: { desc: 'O seu silêncio tornou-se lenda.', a: '"O nosso silêncio é a nossa força."', b: '"Já não precisamos de silêncio. GANHAR!"' },
      rival_sees_weakness: { desc: 'O rival interpretou o seu silêncio como fraqueza.', a: '"O silêncio ACABOU!"', b: '"Que pensem o que quiserem."' },
    }},
    it: { title: '📖 La Rivalità — Epilogo', variants: {
      rivalry_war: { desc: 'Guerra totale. Il rivale manda un messaggio: "Che vinca il migliore."', a: '"Sappiamo tutti chi è il migliore."', b: '"Che vinca il migliore. Senza rancore."' },
      rivalry_cooled: { desc: 'La rivalità si è raffreddata. La squadra è concentrata.', a: 'Sfruttare la calma per preparare', b: 'Accendere un\'ultima scintilla' },
      rival_respected_silence: { desc: 'Il tuo silenzio è diventato leggenda.', a: '"Il nostro silenzio è la nostra forza."', b: '"Non serve più il silenzio. VINCIAMO!"' },
      rival_sees_weakness: { desc: 'Il rivale ha letto il tuo silenzio come debolezza.', a: '"Il silenzio è FINITO!"', b: '"Che pensino quello che vogliono."' },
    }},
  },

  // ════════════════════════════════════════════
  // H. "El Héroe Inesperado" (The Unlikely Hero)
  // ════════════════════════════════════════════
  el_heroe_1: {
    es: { title: '📖 El Héroe Inesperado', desc: 'Un jugador de banquillo, el que nadie esperaba, hace algo increíble en el entrenamiento. Un golazo de volea que deja al portero clavado. Los compañeros aplauden. Este chico tiene algo, pero nunca ha tenido minutos importantes. El próximo partido es crucial.', a: '"Te has ganado una oportunidad. Vas a jugar." (Confiar en él)', b: '"Buen disparo, pero no cambiamos lo que funciona." (Mantener titulares)' },
    en: { title: '📖 The Unlikely Hero', desc: 'A bench player nobody expected does something incredible in training. A stunning volley that leaves the keeper rooted. Teammates applaud. This guy has something, but he\'s never had important minutes. The next match is crucial.', a: '"You\'ve earned a chance. You\'re playing." (Trust him)', b: '"Great shot, but we don\'t change what works." (Stick with starters)' },
    fr: { title: '📖 Le Héros Inattendu', desc: 'Un remplaçant que personne n\'attendait fait quelque chose d\'incroyable à l\'entraînement. Une volée sensationnelle.', a: '"Tu as mérité ta chance. Tu vas jouer."', b: '"Beau tir, mais on ne change pas ce qui marche."' },
    de: { title: '📖 Der Unerwartete Held', desc: 'Ein Bankspieler, den niemand erwartet hat, macht etwas Unglaubliches im Training. Ein sensationeller Volleyschuss.', a: '"Du hast dir eine Chance verdient. Du spielst."', b: '"Guter Schuss, aber wir ändern nichts."' },
    pt: { title: '📖 O Herói Inesperado', desc: 'Um jogador de banco que ninguém esperava faz algo incrível no treino. Uma voléia sensacional.', a: '"Mereceste uma oportunidade. Vais jogar."', b: '"Bom remate, mas não mudamos o que funciona."' },
    it: { title: '📖 L\'Eroe Inaspettato', desc: 'Un giocatore di panchina che nessuno si aspettava fa qualcosa di incredibile in allenamento. Una volée sensazionale.', a: '"Ti sei guadagnato una chance. Giochi."', b: '"Bel tiro, ma non cambiamo ciò che funziona."' },
  },

  el_heroe_2: {
    es: { title: '📖 El Héroe Inesperado — Cap. 2', variants: {
      trusted_bench_player: { desc: 'Le diste la oportunidad y la afición se volvió loca con él. Su nombre suena en los cánticos. Es el favorito de los fans.', a: '"Sigue así, eres nuestro arma secreta"', b: '"Has demostrado, ahora vuelve al banquillo"' },
      stuck_with_starters: { desc: 'Lo dejaste en el banquillo. En cada entrenamiento se parte el alma. Los compañeros preguntan por él.', a: '"He cambiado de opinión. Le doy la oportunidad."', b: '"La experiencia es más importante ahora."' },
    }},
    en: { title: '📖 The Unlikely Hero — Ch. 2', variants: {
      trusted_bench_player: { desc: 'You gave him the chance and fans went crazy. His name echoes in chants. He\'s the fan favorite.', a: '"Keep it up, you\'re our secret weapon"', b: '"You proved yourself, back to the bench now"' },
      stuck_with_starters: { desc: 'You benched him. Every training he gives everything. Teammates ask about him.', a: '"I\'ve changed my mind. He gets his chance."', b: '"Experience matters more now."' },
    }},
    fr: { title: '📖 Le Héros Inattendu — Ch. 2', variants: {
      trusted_bench_player: { desc: 'Vous lui avez donné sa chance et les fans sont devenus fous.', a: '"Continue, tu es notre arme secrète"', b: '"Tu as prouvé, retour au banc"' },
      stuck_with_starters: { desc: 'Vous l\'avez laissé sur le banc. Mais il est le meilleur à l\'entraînement.', a: '"J\'ai changé d\'avis."', b: '"L\'expérience compte plus maintenant."' },
    }},
    de: { title: '📖 Der Unerwartete Held — Kap. 2', variants: {
      trusted_bench_player: { desc: 'Du hast ihm die Chance gegeben und die Fans sind durchgedreht.', a: '"Mach weiter, du bist unsere Geheimwaffe"', b: '"Du hast es bewiesen, zurück auf die Bank"' },
      stuck_with_starters: { desc: 'Du hast ihn auf der Bank gelassen. Aber er ist der Beste im Training.', a: '"Ich habe meine Meinung geändert."', b: '"Erfahrung zählt jetzt mehr."' },
    }},
    pt: { title: '📖 O Herói Inesperado — Cap. 2', variants: {
      trusted_bench_player: { desc: 'Deu-lhe a oportunidade e os adeptos enlouqueceram.', a: '"Continua assim, és a nossa arma secreta"', b: '"Provaste o teu valor, volta ao banco"' },
      stuck_with_starters: { desc: 'Deixou-o no banco. Mas é o melhor nos treinos.', a: '"Mudei de ideias."', b: '"A experiência conta mais agora."' },
    }},
    it: { title: '📖 L\'Eroe Inaspettato — Cap. 2', variants: {
      trusted_bench_player: { desc: 'Gli hai dato la chance e i tifosi sono impazziti.', a: '"Continua così, sei la nostra arma segreta"', b: '"Hai dimostrato, torna in panchina"' },
      stuck_with_starters: { desc: 'L\'hai lasciato in panchina. Ma è il migliore in allenamento.', a: '"Ho cambiato idea."', b: '"L\'esperienza conta di più ora."' },
    }},
  },

  el_heroe_3: {
    es: { title: '📖 El Héroe Inesperado — Desenlace', variants: {
      hero_fan_favorite: { desc: 'Se convirtió en el favorito de todos. Antes del partido decisivo, te abraza: "Gracias por creer en mí."', a: '"Sal ahí y haz lo que mejor sabes."', b: '"Hoy juega para el equipo."' },
      hero_back_to_bench: { desc: 'Lo bajaste al banquillo después de brillar. Perdió su chispa.', a: '"Entra si te necesito."', b: '"Lo siento, es lo mejor para el equipo."' },
      bench_player_bitter: { desc: 'El chico está amargado. Nunca tuvo su oportunidad.', a: '"Me equivoqué. Hoy juegas."', b: '"Lo siento. El equipo es lo primero."' },
      bench_player_accepts: { desc: 'Aceptó su rol con madurez. "Estoy listo si me necesita, míster."', a: '"Te necesito hoy."', b: '"Sé que estás listo. Pero hoy no."' },
    }},
    en: { title: '📖 The Unlikely Hero — Finale', variants: {
      hero_fan_favorite: { desc: 'He became everyone\'s favorite. Before the decisive match, he hugs you: "Thank you for believing in me."', a: '"Go out and do what you do best."', b: '"Today play for the team."' },
      hero_back_to_bench: { desc: 'You benched him after he shone. He lost his spark.', a: '"Come in if I need you."', b: '"I\'m sorry, it\'s best for the team."' },
      bench_player_bitter: { desc: 'The kid is bitter. Never got his chance.', a: '"I was wrong. You play today."', b: '"I\'m sorry. Team comes first."' },
      bench_player_accepts: { desc: 'He accepted his role with maturity. "I\'m ready if you need me, coach."', a: '"I need you today."', b: '"I know you\'re ready. But not today."' },
    }},
    fr: { title: '📖 Le Héros Inattendu — Dénouement', variants: {
      hero_fan_favorite: { desc: 'Il est devenu le favori. "Merci d\'avoir cru en moi."', a: '"Vas-y et fais ce que tu fais le mieux."', b: '"Joue pour l\'équipe."' },
      hero_back_to_bench: { desc: 'Vous l\'avez remis sur le banc. Il a perdu son étincelle.', a: '"Entre si j\'ai besoin."', b: '"Désolé, c\'est le mieux."' },
      bench_player_bitter: { desc: 'Le gamin est amer.', a: '"Je me suis trompé. Tu joues."', b: '"Désolé. L\'équipe d\'abord."' },
      bench_player_accepts: { desc: '"Je suis prêt si vous avez besoin."', a: '"J\'ai besoin de toi."', b: '"Pas aujourd\'hui."' },
    }},
    de: { title: '📖 Der Unerwartete Held — Finale', variants: {
      hero_fan_favorite: { desc: 'Er wurde zum Liebling. "Danke, dass du an mich geglaubt hast."', a: '"Mach dein Ding. Ohne Angst."', b: '"Heute spielst du fürs Team."' },
      hero_back_to_bench: { desc: 'Zurück auf der Bank. Er verlor seinen Funken.', a: '"Komm rein wenn nötig."', b: '"Tut mir leid, das Beste fürs Team."' },
      bench_player_bitter: { desc: 'Der Junge ist verbittert.', a: '"Ich lag falsch. Du spielst."', b: '"Tut mir leid. Team geht vor."' },
      bench_player_accepts: { desc: '"Ich bin bereit wenn Sie mich brauchen."', a: '"Ich brauche dich heute."', b: '"Heute nicht."' },
    }},
    pt: { title: '📖 O Herói Inesperado — Desfecho', variants: {
      hero_fan_favorite: { desc: 'Tornou-se o favorito. "Obrigado por acreditar em mim."', a: '"Faz o que melhor sabes."', b: '"Hoje joga pela equipa."' },
      hero_back_to_bench: { desc: 'Voltou ao banco. Perdeu a faísca.', a: '"Entra se precisar."', b: '"Desculpa, é o melhor."' },
      bench_player_bitter: { desc: 'O miúdo está amargo.', a: '"Enganei-me. Jogas hoje."', b: '"Desculpa. Equipa primeiro."' },
      bench_player_accepts: { desc: '"Estou pronto se precisar."', a: '"Preciso de ti hoje."', b: '"Hoje não."' },
    }},
    it: { title: '📖 L\'Eroe Inaspettato — Epilogo', variants: {
      hero_fan_favorite: { desc: 'È diventato il preferito. "Grazie per aver creduto in me."', a: '"Fai quello che sai fare."', b: '"Oggi gioca per la squadra."' },
      hero_back_to_bench: { desc: 'Rimesso in panchina. Ha perso la scintilla.', a: '"Entra se serve."', b: '"Mi dispiace, è il meglio."' },
      bench_player_bitter: { desc: 'Il ragazzo è amareggiato.', a: '"Mi sbagliavo. Giochi oggi."', b: '"Mi dispiace. Squadra prima."' },
      bench_player_accepts: { desc: '"Sono pronto se serve."', a: '"Ho bisogno di te."', b: '"Oggi no."' },
    }},
  },
};

// ════════════════════════════════════════════
// Decision Memory I18N
// ════════════════════════════════════════════
export const DECISION_MEMORY_I18N = {
  es: {
    promised_victory: 'Recuerda: prometiste la victoria al país entero.',
    stayed_humble: 'Recuerda: elegiste la humildad ante las cámaras.',
    confronted_journalist: 'Recuerda: te enfrentaste al periodista cara a cara.',
    ignored_journalist: 'Recuerda: ignoraste al periodista y él no lo olvidó.',
    sided_with_veteran: 'Recuerda: apoyaste al veterano en el conflicto.',
    mediated_conflict: 'Recuerda: mediaste en el conflicto del vestuario.',
    prodigy_given_chance: 'Recuerda: le diste la oportunidad al prodigio.',
    prodigy_protected: 'Recuerda: protegiste al prodigio de la presión.',
    rested_star: 'Recuerda: descansaste a {starPlayer} cuando estaba tocado.',
    risked_star: 'Recuerda: arriesgaste a {starPlayer} pese a la lesión.',
    accepted_bribe: 'Recuerda: aceptaste el soborno.',
    refused_bribe: 'Recuerda: rechazaste el soborno.',
    responded_to_rival: 'Recuerda: respondiste al rival con fuego.',
    ignored_rival: 'Recuerda: ignoraste las provocaciones del rival.',
    trusted_bench_player: 'Recuerda: confiaste en un jugador de banquillo.',
    stuck_with_starters: 'Recuerda: mantuviste a los titulares de siempre.',
  },
  en: {
    promised_victory: 'Remember: you promised victory to the nation.',
    stayed_humble: 'Remember: you chose humility.',
    confronted_journalist: 'Remember: you confronted the journalist.',
    ignored_journalist: 'Remember: you ignored the journalist.',
    sided_with_veteran: 'Remember: you sided with the veteran.',
    mediated_conflict: 'Remember: you mediated the conflict.',
    prodigy_given_chance: 'Remember: you gave the prodigy his chance.',
    prodigy_protected: 'Remember: you protected the prodigy.',
    rested_star: 'Remember: you rested {starPlayer}.',
    risked_star: 'Remember: you risked {starPlayer}.',
    accepted_bribe: 'Remember: you accepted the bribe.',
    refused_bribe: 'Remember: you refused the bribe.',
    responded_to_rival: 'Remember: you fired back at the rival.',
    ignored_rival: 'Remember: you ignored the rival.',
    trusted_bench_player: 'Remember: you trusted a bench player.',
    stuck_with_starters: 'Remember: you stuck with starters.',
  },
  fr: { promised_victory: 'Rappel : vous avez promis la victoire.', stayed_humble: 'Rappel : vous avez choisi l\'humilité.', confronted_journalist: 'Rappel : confronté le journaliste.', ignored_journalist: 'Rappel : ignoré le journaliste.', sided_with_veteran: 'Rappel : soutenu le vétéran.', mediated_conflict: 'Rappel : médié le conflit.', prodigy_given_chance: 'Rappel : donné sa chance au prodige.', prodigy_protected: 'Rappel : protégé le prodige.', rested_star: 'Rappel : reposé {starPlayer}.', risked_star: 'Rappel : risqué {starPlayer}.', accepted_bribe: 'Rappel : accepté le pot-de-vin.', refused_bribe: 'Rappel : refusé le pot-de-vin.', responded_to_rival: 'Rappel : répondu au rival.', ignored_rival: 'Rappel : ignoré le rival.', trusted_bench_player: 'Rappel : fait confiance au remplaçant.', stuck_with_starters: 'Rappel : gardé les titulaires.' },
  de: { promised_victory: 'Erinnerung: Sieg versprochen.', stayed_humble: 'Erinnerung: Bescheidenheit gewählt.', confronted_journalist: 'Erinnerung: Journalist konfrontiert.', ignored_journalist: 'Erinnerung: Journalist ignoriert.', sided_with_veteran: 'Erinnerung: Veteran unterstützt.', mediated_conflict: 'Erinnerung: Konflikt vermittelt.', prodigy_given_chance: 'Erinnerung: Wunderkind Chance gegeben.', prodigy_protected: 'Erinnerung: Wunderkind geschützt.', rested_star: 'Erinnerung: {starPlayer} geschont.', risked_star: 'Erinnerung: {starPlayer} riskiert.', accepted_bribe: 'Erinnerung: Bestechung angenommen.', refused_bribe: 'Erinnerung: Bestechung abgelehnt.', responded_to_rival: 'Erinnerung: Rivale beantwortet.', ignored_rival: 'Erinnerung: Rivale ignoriert.', trusted_bench_player: 'Erinnerung: Bankspieler vertraut.', stuck_with_starters: 'Erinnerung: Stammspieler behalten.' },
  pt: { promised_victory: 'Lembra-te: prometeste a vitória.', stayed_humble: 'Lembra-te: escolheste humildade.', confronted_journalist: 'Lembra-te: confrontaste o jornalista.', ignored_journalist: 'Lembra-te: ignoraste o jornalista.', sided_with_veteran: 'Lembra-te: apoiaste o veterano.', mediated_conflict: 'Lembra-te: mediaste o conflito.', prodigy_given_chance: 'Lembra-te: deste a chance ao prodígio.', prodigy_protected: 'Lembra-te: protegeste o prodígio.', rested_star: 'Lembra-te: descansaste {starPlayer}.', risked_star: 'Lembra-te: arriscaste {starPlayer}.', accepted_bribe: 'Lembra-te: aceitaste o suborno.', refused_bribe: 'Lembra-te: recusaste o suborno.', responded_to_rival: 'Lembra-te: respondeste ao rival.', ignored_rival: 'Lembra-te: ignoraste o rival.', trusted_bench_player: 'Lembra-te: confiaste no suplente.', stuck_with_starters: 'Lembra-te: mantiveste titulares.' },
  it: { promised_victory: 'Ricorda: hai promesso la vittoria.', stayed_humble: 'Ricorda: hai scelto l\'umiltà.', confronted_journalist: 'Ricorda: hai confrontato il giornalista.', ignored_journalist: 'Ricorda: hai ignorato il giornalista.', sided_with_veteran: 'Ricorda: hai sostenuto il veterano.', mediated_conflict: 'Ricorda: hai mediato il conflitto.', prodigy_given_chance: 'Ricorda: hai dato la chance al prodigio.', prodigy_protected: 'Ricorda: hai protetto il prodigio.', rested_star: 'Ricorda: hai fatto riposare {starPlayer}.', risked_star: 'Ricorda: hai rischiato {starPlayer}.', accepted_bribe: 'Ricorda: hai accettato la tangente.', refused_bribe: 'Ricorda: hai rifiutato la tangente.', responded_to_rival: 'Ricorda: hai risposto al rivale.', ignored_rival: 'Ricorda: hai ignorato il rivale.', trusted_bench_player: 'Ricorda: hai dato fiducia al panchinaro.', stuck_with_starters: 'Ricorda: hai mantenuto i titolari.' },
};

// Chapter banner i18n
export const CHAPTER_BANNER_I18N = {
  es: (idx, total) => `📖 Capítulo ${idx + 1} de ${total}`,
  en: (idx, total) => `📖 Chapter ${idx + 1} of ${total}`,
  fr: (idx, total) => `📖 Chapitre ${idx + 1} sur ${total}`,
  de: (idx, total) => `📖 Kapitel ${idx + 1} von ${total}`,
  pt: (idx, total) => `📖 Capítulo ${idx + 1} de ${total}`,
  it: (idx, total) => `📖 Capitolo ${idx + 1} di ${total}`,
}