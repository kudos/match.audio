module.exports = function (sequelize, DataTypes) {
  const Album = sequelize.define('album', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    externalId: { type: DataTypes.STRING(50), index: true }, // eslint-disable-line new-cap
    service: DataTypes.ENUM( // eslint-disable-line new-cap
      'deezer',
      'google',
      'itunes',
      'spotify',
      'xbox',
      'youtube',
      'ytmusic'
    ),
    name: DataTypes.TEXT,
    artistId: DataTypes.INTEGER,
  }, {
    paranoid: true,
    indexes: [
      {
        fields: ['externalId', 'service'],
      },
    ],
    getterMethods: {
      type() {
        return 'album';
      },
    },
  });

  Album.associate = function associate(models) {
    Album.hasMany(models.match);
    Album.belongsTo(models.artist);
  };

  return Album;
}
