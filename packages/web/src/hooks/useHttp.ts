const URL = import.meta.env.VITE_APP_API_ENDPOINT;

const useHttp = () => {
  return {
    post: <BODY>(path: string, body: BODY) => {
      return fetch(URL + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer temp',
        },
        body: JSON.stringify(body),
      });
    },
  };
};

export default useHttp;
