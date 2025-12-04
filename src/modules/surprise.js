import books from '../data/surprise.json';

let lastIndex = -1;

const getRandomIndex = () => {
  if (!Array.isArray(books) || books.length === 0) {
    throw new Error('surprise.json is empty or missing.');
  }

  if (books.length === 1) {
    return 0;
  }

  let nextIndex = Math.floor(Math.random() * books.length);
  if (nextIndex === lastIndex) {
    nextIndex = (nextIndex + 1) % books.length;
  }

  lastIndex = nextIndex;
  return nextIndex;
};

export function getRandomBook() {
  const index = getRandomIndex();
  return { ...books[index] };
}

export default getRandomBook;
