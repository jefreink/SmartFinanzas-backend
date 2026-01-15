let ioInstance = null;

exports.setIo = (io) => {
  ioInstance = io;
};

exports.getIo = () => ioInstance;
