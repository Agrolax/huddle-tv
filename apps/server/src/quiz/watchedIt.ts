import {QuizItem, q} from './questions.js';

/**
 * Hand-written question sets for the mock, so Watched It works without
 * Bedrock. Keys are lowercase titles from the mock Tonight catalog.
 */
const BANK: Record<string, QuizItem[]> = {
  'paddington 2': [
    q('What does Paddington want to buy for Aunt Lucy?', 'A pop-up book', 'A teapot', 'A new hat', 'A jar of honey'),
    q('Which food does Paddington love most?', 'Marmalade', 'Honey', 'Cheese', 'Jam doughnuts'),
    q('Who plays the actor Phoenix Buchanan?', 'Hugh Grant', 'Hugh Bonneville', 'Ben Whishaw', 'Brendan Gleeson'),
    q('Which country does Paddington come from?', 'Peru', 'Brazil', 'Mexico', 'Chile'),
    q('What job does Knuckles McGinty have in prison?', 'Cook', 'Guard', 'Barber', 'Librarian'),
  ],
  'knives out': [
    q('What is the detective called?', 'Benoit Blanc', 'Hercule Poirot', 'Sherlock Holmes', 'Columbo'),
    q('Who plays the detective?', 'Daniel Craig', 'Chris Evans', 'Christopher Plummer', 'Don Johnson'),
    q('What was Harlan Thrombey’s job?', 'Mystery writer', 'Banker', 'Doctor', 'Chef'),
    q('What happens when Marta tells a lie?', 'She throws up', 'She sneezes', 'She laughs', 'She hiccups'),
    q('What does Ransom wear that everyone remembers?', 'A cable-knit sweater', 'A leather jacket', 'A bow tie', 'A cowboy hat'),
  ],
  'school of rock': [
    q('What job does Dewey pretend to have?', 'Substitute teacher', 'Music store clerk', 'Bus driver', 'School janitor'),
    q('Whose name does Dewey use at the school?', 'Ned Schneebly', 'Zack Mooneyham', 'Mr. Brown', 'Theo Finn'),
    q('What contest does the class enter?', 'Battle of the Bands', 'A talent show', 'A spelling bee', 'A science fair'),
    q('What does Zack play in the band?', 'Lead guitar', 'Drums', 'Keyboard', 'Bass'),
    q('Who plays Principal Mullins?', 'Joan Cusack', 'Sarah Silverman', 'Amy Poehler', 'Tina Fey'),
  ],
  up: [
    q('How does Carl make his house fly?', 'Balloons', 'A rocket', 'A kite', 'A big fan'),
    q('What is the name of the boy who comes along?', 'Russell', 'Kevin', 'Charles', 'Dug'),
    q('What does Dug’s special collar do?', 'Lets him talk', 'Glows in the dark', 'Finds treasure', 'Makes him fly'),
    q('What kind of animal is Kevin?', 'A bird', 'A dog', 'A snake', 'A monkey'),
    q('Where do Carl and Ellie dream of going?', 'Paradise Falls', 'Victoria Falls', 'Rainbow Bay', 'Sunset Peak'),
  ],
  'my neighbor totoro': [
    q('What are the two sisters called?', 'Satsuki and Mei', 'Kiki and Jiji', 'Chihiro and Lin', 'Sophie and Lettie'),
    q('Which magical ride appears at the bus stop?', 'The Catbus', 'A dragon', 'A flying boat', 'A paper crane'),
    q('What does Satsuki lend Totoro in the rain?', 'An umbrella', 'A hat', 'A coat', 'A lantern'),
    q('What gift does Totoro give the girls?', 'A bundle of nuts and seeds', 'A spinning top', 'A flute', 'A lantern'),
    q('Which studio made the film?', 'Studio Ghibli', 'Pixar', 'DreamWorks', 'Aardman'),
  ],
};

/** For a title the mock doesn't know: family movie trivia instead. */
export const MOVIE_TRIVIA: QuizItem[] = [
  q('Which studio made Toy Story?', 'Pixar', 'DreamWorks', 'Disney Animation', 'Illumination'),
  q('In Finding Nemo, what kind of fish is Nemo?', 'Clownfish', 'Goldfish', 'Angelfish', 'Pufferfish'),
  q('What is the lion cub called in The Lion King?', 'Simba', 'Nala', 'Mufasa', 'Kovu'),
  q('What color is Shrek?', 'Green', 'Blue', 'Brown', 'Purple'),
  q('In Frozen, who sings “Let It Go”?', 'Elsa', 'Anna', 'Olaf', 'Kristoff'),
];

/** The mock's questions for a title, or null when it has none. */
export function mockWatchedIt(title: string): QuizItem[] | null {
  return BANK[title.trim().toLowerCase()] ?? null;
}

export function knownMockTitles(): string[] {
  return Object.keys(BANK);
}
