if [ -f src/assets/theme/name ]; then 
    NAME=`cat src/assets/theme/name`; 
    cp -rf src/assets/theme/* themes/$NAME; 
fi 

rm -rf src/assets/theme
mkdir src/assets/theme
cp -rf themes/$1/* src/assets/theme