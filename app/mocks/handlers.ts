import { delay, http, HttpResponse, graphql } from 'msw';
import { graphql as executeGraphql } from 'graphql';
import { schema } from './graphqlSchema';

import { movies } from './mockData';

export const handlers = [
  http.get('https://api.example.com/movies/featured', () => {
    return HttpResponse.json(movies);
  }),
  http.get('https://api.example.com/movies/:slug', ({ params }) => {
    const movie = movies.find((movie) => movie.slug === params.slug);

    if (!movie) {
      return new HttpResponse('Not found', { status: 404 });
    }

    return HttpResponse.json(movie);
  }),
  http.get('/api/recommendations', async ({ request }) => {
    const url = new URL(request.url);
    const movieId = url.searchParams.get('movieId');

    // return HttpResponse.error() // this is a network error, fetch api will fail, it means request was not processed or even reached the server

    await delay('real'); // real (default) or infinite

    if (!movieId) {
      return HttpResponse.json(
        { error: 'Missing query param "movieId"' },
        { status: 400 }
      );
    }

    if (movieId === 'b2b7e2d9-8b2e-4b7a-9b8a-7f9a0d7f7e0e') {
      return new HttpResponse(null, { status: 500 });
    }

    const recommendations = movies.filter((movie) => movie.id !== movieId);
    return HttpResponse.json(recommendations);
  }),
  http.post('https://auth.provider.com/validate', async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    if (!email || !password) {
      return new HttpResponse('', { status: 400 });
    }

    const user = {
      id: '2b225b31-904a-443b-a898-a280fa8e0356',
      email,
      firstName: 'John',
      lastName: 'Maverick',
      avatarUrl: 'https://i.pravatar.cc/100?img=12',
    };

    return HttpResponse.json(user);
  }),

  /**
   *      query ListReviews($movieId: ID!) {
   *         reviews(movieId: $movieId) {
   *           id
   *           text
   *           rating
   *           author {
   *             firstName
   *             avatarUrl
   *           }
   *         }
   *       }
   */
  graphql.query('ListReviews', async ({ query, variables }) => {
    const { data, errors } = await executeGraphql({
      schema,
      source: query,
      variableValues: variables,
      rootValue: {
        reviews(args) {
          const movie = movies.find((movie) => movie.id === args.movieId);
          return movie?.reviews || [];
        },
      },
    });

    return HttpResponse.json({ data, errors });
  }),

  /*
  mutation AddReview($author: UserInput!, $reviewInput: ReviewInput!) {
    addReview(author: $author, reviewInput: $reviewInput) {
      id
      text
      author {
        id
        firstName
        avatarUrl
      }
    }
  }
  */
  graphql.mutation('AddReview', async ({ variables }) => {
    const { author, reviewInput } = variables;
    const { movieId, ...review } = reviewInput;
    const movie = movies.find((movie) => movie.id === movieId);

    if (!movie) {
      return HttpResponse.json({
        data: null,
        errors: [new Error('Invalid movie id')],
      });
    }

    const newReview = {
      ...review,
      id: Math.random().toString(16).slice(2),
      author,
    };

    const prevReviews = movie?.reviews || [];
    movie.reviews = [...prevReviews, newReview];

    return HttpResponse.json({
      data: {
        addReview: newReview,
      },
    });
  }),
];
