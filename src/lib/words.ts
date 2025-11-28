export interface Word {
    word: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
}

export const WORD_BANK: Word[] = [
    // Easy (1pt)
    { word: "Apple", difficulty: 'easy', points: 1 },
    { word: "Dog", difficulty: 'easy', points: 1 },
    { word: "Cat", difficulty: 'easy', points: 1 },
    { word: "Sun", difficulty: 'easy', points: 1 },
    { word: "Moon", difficulty: 'easy', points: 1 },
    { word: "Car", difficulty: 'easy', points: 1 },
    { word: "Book", difficulty: 'easy', points: 1 },
    { word: "Fish", difficulty: 'easy', points: 1 },
    { word: "Tree", difficulty: 'easy', points: 1 },
    { word: "Ball", difficulty: 'easy', points: 1 },
    { word: "Chair", difficulty: 'easy', points: 1 },
    { word: "Door", difficulty: 'easy', points: 1 },
    { word: "Shoe", difficulty: 'easy', points: 1 },
    { word: "Hat", difficulty: 'easy', points: 1 },
    { word: "Bird", difficulty: 'easy', points: 1 },
    { word: "Milk", difficulty: 'easy', points: 1 },
    { word: "Bed", difficulty: 'easy', points: 1 },
    { word: "Rain", difficulty: 'easy', points: 1 },
    { word: "Snow", difficulty: 'easy', points: 1 },
    { word: "Fire", difficulty: 'easy', points: 1 },

    // Medium (3pts)
    { word: "Guitar", difficulty: 'medium', points: 3 },
    { word: "Planet", difficulty: 'medium', points: 3 },
    { word: "Doctor", difficulty: 'medium', points: 3 },
    { word: "School", difficulty: 'medium', points: 3 },
    { word: "Summer", difficulty: 'medium', points: 3 },
    { word: "Winter", difficulty: 'medium', points: 3 },
    { word: "Friend", difficulty: 'medium', points: 3 },
    { word: "Family", difficulty: 'medium', points: 3 },
    { word: "Garden", difficulty: 'medium', points: 3 },
    { word: "Market", difficulty: 'medium', points: 3 },
    { word: "Office", difficulty: 'medium', points: 3 },
    { word: "Travel", difficulty: 'medium', points: 3 },
    { word: "Music", difficulty: 'medium', points: 3 },
    { word: "Movie", difficulty: 'medium', points: 3 },
    { word: "Phone", difficulty: 'medium', points: 3 },
    { word: "Laptop", difficulty: 'medium', points: 3 },
    { word: "Camera", difficulty: 'medium', points: 3 },
    { word: "Coffee", difficulty: 'medium', points: 3 },
    { word: "Pizza", difficulty: 'medium', points: 3 },
    { word: "Burger", difficulty: 'medium', points: 3 },

    // Hard (5pts)
    { word: "Astronaut", difficulty: 'hard', points: 5 },
    { word: "Microscope", difficulty: 'hard', points: 5 },
    { word: "Telescope", difficulty: 'hard', points: 5 },
    { word: "Symphony", difficulty: 'hard', points: 5 },
    { word: "Evolution", difficulty: 'hard', points: 5 },
    { word: "Revolution", difficulty: 'hard', points: 5 },
    { word: "Philosophy", difficulty: 'hard', points: 5 },
    { word: "Psychology", difficulty: 'hard', points: 5 },
    { word: "Architecture", difficulty: 'hard', points: 5 },
    { word: "Engineering", difficulty: 'hard', points: 5 },
    { word: "Photosynthesis", difficulty: 'hard', points: 5 },
    { word: "Metamorphosis", difficulty: 'hard', points: 5 },
    { word: "Constellation", difficulty: 'hard', points: 5 },
    { word: "Civilization", difficulty: 'hard', points: 5 },
    { word: "Globalization", difficulty: 'hard', points: 5 },
];
