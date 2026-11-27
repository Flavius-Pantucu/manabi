import type { Language } from "@/lib/content/types";

export type PhraseScenario =
  | "essentials"
  | "dining"
  | "transit"
  | "hotel"
  | "shopping"
  | "emergency";

export interface PhraseEntry {
  id: string;
  scenario: PhraseScenario;
  phrase: string;
  reading: string;
  meaning: string;
  note?: string;
}

export const SCENARIOS: { id: PhraseScenario; label: string }[] = [
  { id: "essentials", label: "Essentials" },
  { id: "dining", label: "Café & Dining" },
  { id: "transit", label: "Transit & Directions" },
  { id: "hotel", label: "Hotel & Stays" },
  { id: "shopping", label: "Shopping" },
  { id: "emergency", label: "Emergencies" },
];

export const PHRASES: Record<Language, PhraseEntry[]> = {
  es: [
    { id: "es-1", scenario: "essentials", phrase: "Disculpe, ¿habla inglés?", reading: "dees-kool-peh, ah-blah een-glehs", meaning: "Excuse me, do you speak English?" },
    { id: "es-2", scenario: "essentials", phrase: "No entiendo, ¿puede repetirlo?", reading: "noh ehn-tyehn-doh, pweh-deh reh-peh-teer-loh", meaning: "I don't understand, could you repeat that?" },
    { id: "es-3", scenario: "essentials", phrase: "Más despacio, por favor.", reading: "mahs dehs-pah-syoh, pohr fah-bohr", meaning: "More slowly, please." },
    { id: "es-4", scenario: "dining", phrase: "Una mesa para dos, por favor.", reading: "oo-nah meh-sah pah-rah dohs", meaning: "A table for two, please." },
    { id: "es-5", scenario: "dining", phrase: "¿Qué me recomienda?", reading: "keh meh reh-koh-myehn-dah", meaning: "What do you recommend?" },
    { id: "es-6", scenario: "dining", phrase: "La cuenta, por favor.", reading: "lah kwehn-tah, pohr fah-bohr", meaning: "The bill, please." },
    { id: "es-7", scenario: "transit", phrase: "¿Dónde está la estación de metro?", reading: "dohn-deh eh-stah lah eh-stah-syohn", meaning: "Where is the metro station?" },
    { id: "es-8", scenario: "transit", phrase: "Un billete de ida y vuelta, por favor.", reading: "oon bee-yeh-teh deh ee-dah ee bwehl-tah", meaning: "A round-trip ticket, please." },
    { id: "es-9", scenario: "hotel", phrase: "Tengo una reserva a nombre de…", reading: "tehn-goh oo-nah reh-sehr-bah", meaning: "I have a reservation under the name…" },
    { id: "es-10", scenario: "hotel", phrase: "¿A qué hora es el desayuno?", reading: "ah keh oh-rah ehs ehl deh-sah-yoo-noh", meaning: "What time is breakfast?" },
    { id: "es-11", scenario: "shopping", phrase: "¿Cuánto cuesta esto?", reading: "kwahn-toh kweh-stah eh-stoh", meaning: "How much does this cost?" },
    { id: "es-12", scenario: "shopping", phrase: "¿Puedo pagar con tarjeta?", reading: "pweh-doh pah-gahr kohn tahr-heh-tah", meaning: "Can I pay by card?" },
    { id: "es-13", scenario: "emergency", phrase: "¡Necesito ayuda, por favor!", reading: "neh-seh-see-toh ah-yoo-dah", meaning: "I need help, please!" },
    { id: "es-14", scenario: "emergency", phrase: "¿Dónde hay una farmacia?", reading: "dohn-deh ahy oo-nah fahr-mah-syah", meaning: "Where is there a pharmacy?" },
  ],
  fr: [
    { id: "fr-1", scenario: "essentials", phrase: "Excusez-moi, parlez-vous anglais ?", reading: "ehk-skyoo-zeh mwah, pahr-leh voo ahn-gleh", meaning: "Excuse me, do you speak English?" },
    { id: "fr-2", scenario: "essentials", phrase: "Je ne comprends pas, pouvez-vous répéter ?", reading: "zhuh nuh kohn-prahn pah", meaning: "I don't understand, could you repeat?" },
    { id: "fr-3", scenario: "essentials", phrase: "Plus lentement, s'il vous plaît.", reading: "plyoo lahnt-mahn, seel voo pleh", meaning: "More slowly, please." },
    { id: "fr-4", scenario: "dining", phrase: "Une table pour deux, s'il vous plaît.", reading: "yoon tah-bluh poor duh", meaning: "A table for two, please." },
    { id: "fr-5", scenario: "dining", phrase: "Qu'est-ce que vous recommandez ?", reading: "kehs-kuh voo ruh-koh-mahn-deh", meaning: "What do you recommend?" },
    { id: "fr-6", scenario: "dining", phrase: "L'addition, s'il vous plaît.", reading: "lah-dee-syohn, seel voo pleh", meaning: "The bill, please." },
    { id: "fr-7", scenario: "transit", phrase: "Où est la station de métro ?", reading: "oo eh lah stah-syohn duh meh-troh", meaning: "Where is the metro station?" },
    { id: "fr-8", scenario: "transit", phrase: "Un billet aller-retour, s'il vous plaît.", reading: "uhn bee-yeh ah-leh ruh-toor", meaning: "A round-trip ticket, please." },
    { id: "fr-9", scenario: "hotel", phrase: "J'ai une réservation au nom de…", reading: "zheh yoon reh-zehr-vah-syohn", meaning: "I have a reservation under the name…" },
    { id: "fr-10", scenario: "hotel", phrase: "À quelle heure est le petit-déjeuner ?", reading: "ah kehl uhr eh luh puh-tee deh-zhuh-neh", meaning: "What time is breakfast?" },
    { id: "fr-11", scenario: "shopping", phrase: "Combien coûte ceci ?", reading: "kohn-byahn koot suh-see", meaning: "How much does this cost?" },
    { id: "fr-12", scenario: "shopping", phrase: "Puis-je payer par carte ?", reading: "pweezh peh-yeh pahr kahrt", meaning: "Can I pay by card?" },
    { id: "fr-13", scenario: "emergency", phrase: "J'ai besoin d'aide, s'il vous plaît !", reading: "zheh buh-zwahn dehd", meaning: "I need help, please!" },
    { id: "fr-14", scenario: "emergency", phrase: "Où y a-t-il une pharmacie ?", reading: "oo ee ah-teel yoon fahr-mah-see", meaning: "Where is there a pharmacy?" },
  ],
  it: [
    { id: "it-1", scenario: "essentials", phrase: "Mi scusi, parla inglese?", reading: "mee skoo-zee, pahr-lah een-gleh-zeh", meaning: "Excuse me, do you speak English?" },
    { id: "it-2", scenario: "essentials", phrase: "Non capisco, può ripetere?", reading: "nohn kah-pee-skoh, pwoh ree-peh-teh-reh", meaning: "I don't understand, could you repeat?" },
    { id: "it-3", scenario: "essentials", phrase: "Più lentamente, per favore.", reading: "pyoo lehn-tah-mehn-teh, pehr fah-voh-reh", meaning: "More slowly, please." },
    { id: "it-4", scenario: "dining", phrase: "Un tavolo per due, per favore.", reading: "oon tah-voh-loh pehr doo-eh", meaning: "A table for two, please." },
    { id: "it-5", scenario: "dining", phrase: "Cosa mi consiglia?", reading: "koh-zah mee kohn-see-lyah", meaning: "What do you recommend?" },
    { id: "it-6", scenario: "dining", phrase: "Il conto, per favore.", reading: "eel kohn-toh, pehr fah-voh-reh", meaning: "The bill, please." },
    { id: "it-7", scenario: "transit", phrase: "Dov'è la stazione della metro?", reading: "doh-veh lah staht-syoh-neh", meaning: "Where is the metro station?" },
    { id: "it-8", scenario: "transit", phrase: "Un biglietto di andata e ritorno.", reading: "oon bee-lyeht-toh dee ahn-dah-tah eh ree-tohr-noh", meaning: "A round-trip ticket." },
    { id: "it-9", scenario: "hotel", phrase: "Ho una prenotazione a nome di…", reading: "oh oo-nah preh-noh-taht-syoh-neh", meaning: "I have a reservation under the name…" },
    { id: "it-10", scenario: "hotel", phrase: "A che ora è la colazione?", reading: "ah keh oh-rah eh lah koh-laht-syoh-neh", meaning: "What time is breakfast?" },
    { id: "it-11", scenario: "shopping", phrase: "Quanto costa questo?", reading: "kwahn-toh koh-stah kweh-stoh", meaning: "How much does this cost?" },
    { id: "it-12", scenario: "shopping", phrase: "Posso pagare con la carta?", reading: "pohs-soh pah-gah-reh kohn lah kahr-tah", meaning: "Can I pay by card?" },
    { id: "it-13", scenario: "emergency", phrase: "Ho bisogno di aiuto, per favore!", reading: "oh bee-zoh-nyoh dee ah-yoo-toh", meaning: "I need help, please!" },
    { id: "it-14", scenario: "emergency", phrase: "Dov'è una farmacia?", reading: "doh-veh oo-nah fahr-mah-chee-ah", meaning: "Where is a pharmacy?" },
  ],
  ja: [
    { id: "ja-1", scenario: "essentials", phrase: "すみません、英語を話せますか？", reading: "すみません、えいごをはなせますか？", meaning: "Excuse me, do you speak English?" },
    { id: "ja-2", scenario: "essentials", phrase: "もう一度お願いします。", reading: "もういちどおねがいします。", meaning: "One more time, please." },
    { id: "ja-3", scenario: "essentials", phrase: "もう少しゆっくり話してください。", reading: "もうすこしゆっくりはなしてください。", meaning: "Please speak a little more slowly." },
    { id: "ja-4", scenario: "dining", phrase: "二人です。", reading: "ふたりです。", meaning: "Table for two." },
    { id: "ja-5", scenario: "dining", phrase: "おすすめは何ですか？", reading: "おすすめはなんですか？", meaning: "What do you recommend?" },
    { id: "ja-6", scenario: "dining", phrase: "お会計をお願いします。", reading: "おかいけいをおねがいします。", meaning: "The bill, please." },
    { id: "ja-7", scenario: "transit", phrase: "駅はどこですか？", reading: "えきはどこですか？", meaning: "Where is the station?" },
    { id: "ja-8", scenario: "transit", phrase: "この電車は東京に行きますか？", reading: "このでんしゃはとうきょうにいきますか？", meaning: "Does this train go to Tokyo?" },
    { id: "ja-9", scenario: "hotel", phrase: "予約しています。", reading: "よやくしています。", meaning: "I have a reservation." },
    { id: "ja-10", scenario: "hotel", phrase: "朝食は何時からですか？", reading: "ちょうしょくはなんじからですか？", meaning: "What time does breakfast start?" },
    { id: "ja-11", scenario: "shopping", phrase: "これはいくらですか？", reading: "これはいくらですか？", meaning: "How much is this?" },
    { id: "ja-12", scenario: "shopping", phrase: "クレジットカードは使えますか？", reading: "クレジットカードはつかえますか？", meaning: "Can I use a credit card?" },
    { id: "ja-13", scenario: "emergency", phrase: "助けてください！", reading: "たすけてください！", meaning: "Please help me!" },
    { id: "ja-14", scenario: "emergency", phrase: "薬局はどこですか？", reading: "やっきょくはどこですか？", meaning: "Where is the pharmacy?" },
  ],
};
